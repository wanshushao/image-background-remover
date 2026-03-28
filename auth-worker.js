// Auth Worker - Google OAuth + User Management + PayPal Payments
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    };

    try {
      // ===== Google OAuth =====
      if (url.pathname === '/api/auth/google') {
        const redirectUri = `${url.origin}/api/auth/callback`;
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${env.GOOGLE_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=openid%20email%20profile`;
        return Response.json({ authUrl }, { headers: corsHeaders });
      }

      if (url.pathname === '/api/auth/callback') {
        return handleCallback(request, env, url);
      }

      if (url.pathname === '/api/user') {
        return handleGetUser(request, env, corsHeaders);
      }

      // ===== Remove BG =====
      if (url.pathname === '/api/remove-bg') {
        return handleRemoveBg(request, env, corsHeaders);
      }

      // ===== PayPal: 一次性购买积分包 =====
      if (url.pathname === '/api/paypal/create-order' && request.method === 'POST') {
        return handleCreateOrder(request, env, corsHeaders);
      }

      if (url.pathname === '/api/paypal/capture-order' && request.method === 'POST') {
        return handleCaptureOrder(request, env, corsHeaders);
      }

      // ===== PayPal: 订阅 =====
      if (url.pathname === '/api/paypal/create-subscription' && request.method === 'POST') {
        return handleCreateSubscription(request, env, corsHeaders);
      }

      if (url.pathname === '/api/paypal/subscription-success' && request.method === 'POST') {
        return handleSubscriptionSuccess(request, env, corsHeaders);
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
  },
};

// ===== Google OAuth Callback =====
async function handleCallback(request, env, url) {
  const code = url.searchParams.get('code');
  if (!code) {
    return new Response('<h1>登录失败：缺少授权码</h1>', {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/api/auth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(tokens));

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json();

    const existing = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(userInfo.email).first();
    if (!existing) {
      await env.DB.prepare('INSERT INTO users (email, name, avatar) VALUES (?, ?, ?)').bind(
        userInfo.email, userInfo.name, userInfo.picture
      ).run();
    }

    const sessionToken = crypto.randomUUID();
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 3600;
    await env.DB.prepare('INSERT INTO sessions (token, user_email, expires_at) VALUES (?, ?, ?)').bind(
      sessionToken, userInfo.email, expiresAt
    ).run();

    return new Response(`<script>window.location.href='https://image-background-remover-8jc.pages.dev/?token=${sessionToken}';</script>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (e) {
    return new Response(`<h1>登录失败：${e.message}</h1>`, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// ===== Get User =====
async function handleGetUser(request, env, corsHeaders) {
  const session = await getSession(request, env);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const user = await env.DB.prepare(
    'SELECT email, name, avatar, credits, subscription_status, subscription_end FROM users WHERE email = ?'
  ).bind(session.user_email).first();

  return Response.json(user, { headers: corsHeaders });
}

// ===== Remove Background =====
async function handleRemoveBg(request, env, corsHeaders) {
  const session = await getSession(request, env);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(session.user_email).first();

  // 检查是否有有效订阅
  const hasActiveSub = user.subscription_status === 'active' &&
    user.subscription_end > Math.floor(Date.now() / 1000);

  if (!hasActiveSub && user.credits <= 0) {
    return Response.json({ error: 'No credits' }, { status: 403, headers: corsHeaders });
  }

  const { imageBase64 } = await request.json();
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': env.REMOVE_BG_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_file_b64: imageBase64, size: 'auto', type: 'auto' }),
  });

  if (!response.ok) {
    return Response.json({ error: 'Remove.bg API error' }, { status: response.status, headers: corsHeaders });
  }

  // 扣除积分（订阅用户不扣）
  if (!hasActiveSub) {
    await env.DB.prepare('UPDATE users SET credits = credits - 1, updated_at = ? WHERE email = ?').bind(
      Math.floor(Date.now() / 1000), session.user_email
    ).run();
  }

  await env.DB.prepare('INSERT INTO usage_logs (user_email, action) VALUES (?, ?)').bind(
    session.user_email, 'remove_bg'
  ).run();

  const buffer = await response.arrayBuffer();
  return new Response(buffer, {
    headers: { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' },
  });
}

// ===== PayPal Helper: Get Access Token =====
async function getPayPalToken(env) {
  const res = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

// ===== PayPal: Create Order (积分包一次性支付) =====
async function handleCreateOrder(request, env, corsHeaders) {
  const session = await getSession(request, env);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const { planId } = await request.json();

  const plans = {
    starter: { price: '4.99', credits: 10, name: 'Starter Pack - 10 Credits' },
    popular:  { price: '12.99', credits: 30, name: 'Popular Pack - 30 Credits' },
    pro:      { price: '29.99', credits: 80, name: 'Pro Pack - 80 Credits' },
  };

  const plan = plans[planId];
  if (!plan) return Response.json({ error: 'Invalid plan' }, { status: 400, headers: corsHeaders });

  const token = await getPayPalToken(env);

  const orderRes = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: { currency_code: 'USD', value: plan.price },
        description: plan.name,
        custom_id: JSON.stringify({ email: session.user_email, planId, credits: plan.credits }),
      }],
      application_context: {
        brand_name: 'BgRemover',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
      },
    }),
  });

  const order = await orderRes.json();
  return Response.json({ orderId: order.id }, { headers: corsHeaders });
}

// ===== PayPal: Capture Order (支付完成，发放积分) =====
async function handleCaptureOrder(request, env, corsHeaders) {
  const session = await getSession(request, env);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const { orderId } = await request.json();
  const token = await getPayPalToken(env);

  const captureRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const capture = await captureRes.json();

  if (capture.status === 'COMPLETED') {
    const customId = JSON.parse(capture.purchase_units[0].payments.captures[0].custom_id || '{}');
    const credits = customId.credits || 0;

    await env.DB.prepare('UPDATE users SET credits = credits + ?, updated_at = ? WHERE email = ?').bind(
      credits, Math.floor(Date.now() / 1000), session.user_email
    ).run();

    await env.DB.prepare('INSERT INTO usage_logs (user_email, action) VALUES (?, ?)').bind(
      session.user_email, `purchase_${customId.planId}_${credits}credits`
    ).run();

    const user = await env.DB.prepare('SELECT credits FROM users WHERE email = ?').bind(session.user_email).first();
    return Response.json({ success: true, credits: user.credits }, { headers: corsHeaders });
  }

  return Response.json({ error: 'Payment not completed', status: capture.status }, { status: 400, headers: corsHeaders });
}

// ===== PayPal: Create Subscription =====
async function handleCreateSubscription(request, env, corsHeaders) {
  const session = await getSession(request, env);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const { planId } = await request.json();

  // PayPal Subscription Plan IDs（沙箱环境需要先在 PayPal Dashboard 创建，这里用占位符）
  const subPlans = {
    basic:     { paypalPlanId: env.PAYPAL_PLAN_BASIC,     name: 'Basic $7.99/mo' },
    unlimited: { paypalPlanId: env.PAYPAL_PLAN_UNLIMITED,  name: 'Unlimited $19.99/mo' },
  };

  const plan = subPlans[planId];
  if (!plan || !plan.paypalPlanId) {
    return Response.json({ error: 'Subscription plan not configured' }, { status: 400, headers: corsHeaders });
  }

  const token = await getPayPalToken(env);

  const subRes = await fetch('https://api-m.sandbox.paypal.com/v1/billing/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      plan_id: plan.paypalPlanId,
      custom_id: JSON.stringify({ email: session.user_email, planId }),
      application_context: {
        brand_name: 'BgRemover',
        user_action: 'SUBSCRIBE_NOW',
        return_url: `https://image-background-remover-8jc.pages.dev/?sub_success=1`,
        cancel_url: `https://image-background-remover-8jc.pages.dev/?sub_cancel=1`,
      },
    }),
  });

  const sub = await subRes.json();
  const approveLink = sub.links?.find(l => l.rel === 'approve')?.href;

  return Response.json({ approveUrl: approveLink, subscriptionId: sub.id }, { headers: corsHeaders });
}

// ===== PayPal: Subscription Success Webhook =====
async function handleSubscriptionSuccess(request, env, corsHeaders) {
  const session = await getSession(request, env);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

  const { subscriptionId, planId } = await request.json();

  const credits = planId === 'unlimited' ? 9999 : 60;
  const endTime = Math.floor(Date.now() / 1000) + 30 * 24 * 3600; // 30天

  await env.DB.prepare(
    'UPDATE users SET subscription_id = ?, subscription_status = ?, subscription_end = ?, credits = ?, updated_at = ? WHERE email = ?'
  ).bind(subscriptionId, 'active', endTime, credits, Math.floor(Date.now() / 1000), session.user_email).run();

  const user = await env.DB.prepare('SELECT credits, subscription_status FROM users WHERE email = ?').bind(session.user_email).first();
  return Response.json({ success: true, credits: user.credits }, { headers: corsHeaders });
}

// ===== Helper: Get Session =====
async function getSession(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.substring(7);
  return await env.DB.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > ?'
  ).bind(token, Math.floor(Date.now() / 1000)).first();
}
