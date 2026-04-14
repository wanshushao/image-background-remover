// image-bg-auth - 简洁调试版

var GOOGLE_CLIENT_ID = "1042944429385-7ogkal95ahbinqh1p13tri95eke8mr5j.apps.googleusercontent.com";
var GOOGLE_CLIENT_SECRET = "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";
var FRONTEND_URL = "https://imagebackground-remover.shop";
var PLANS = {
  starter: { price: 4.99, credits: 10 },
  popular: { price: 12.99, credits: 30 },
  pro: { price: 29.99, credits: 80 }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": FRONTEND_URL,
      "Content-Type": "application/json",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Google OAuth 登录
    if (url.pathname === "/api/auth/google") {
      const redirectUri = "https://image-bg-auth.m15629127687.workers.dev/api/auth/callback";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline`;
      return new Response(JSON.stringify({ authUrl }), { headers: corsHeaders });
    }

    // OAuth 回调
    if (url.pathname === "/api/auth/callback") {
      const code = url.searchParams.get("code");
      if (!code) return Response.redirect(`${FRONTEND_URL}?error=no_code`, 302);
      try {
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: "https://image-bg-auth.m15629127687.workers.dev/api/auth/callback",
            grant_type: "authorization_code"
          })
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) throw new Error("No access token");

        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: "Bearer " + tokenData.access_token }
        });
        const userInfo = await userRes.json();

        const existing = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(userInfo.email).first();
        let userId = existing ? existing.id : crypto.randomUUID();
        if (!existing) {
          await env.DB.prepare("INSERT INTO users (id, email, name, credits) VALUES (?, ?, ?, ?)").bind(userId, userInfo.email, userInfo.name, 3).run();
        }

        const sessionId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").bind(sessionId, userId, Date.now() + 30 * 24 * 60 * 60 * 1000).run();
        return Response.redirect(FRONTEND_URL + "?token=" + sessionId, 302);
      } catch (e) {
        return Response.redirect(FRONTEND_URL + "?error=" + e.message, 302);
      }
    }

    // 获取用户信息
    if (url.pathname === "/api/user") {
      const token = request.headers.get("Authorization");
      if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      token = token.replace("Bearer ", "");
      const session = await env.DB.prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > ?").bind(token, Date.now()).first();
      if (!session) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
      const user = await env.DB.prepare("SELECT id, email, name, credits, subscription_status FROM users WHERE id = ?").bind(session.user_id).first();
      return new Response(JSON.stringify(user), { headers: corsHeaders });
    }

    // Remove Background
    if (url.pathname === "/api/remove-bg") {
      const token = request.headers.get("Authorization");
      if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      token = token.replace("Bearer ", "");
      const session = await env.DB.prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > ?").bind(token, Date.now()).first();
      if (!session) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });
      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(session.user_id).first();

      const hasActiveSub = user.subscription_status === "active";
      if (!hasActiveSub && (!user.credits || user.credits < 1)) {
        return new Response(JSON.stringify({ error: "No credits" }), { status: 403, headers: corsHeaders });
      }

      const { imageBase64 } = await request.json();
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: "No image provided" }), { status: 400, headers: corsHeaders });
      }

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": env.REMOVE_BG_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ image_file_b64: imageBase64, size: "auto", type: "auto" })
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ error: "Remove.bg API error: " + response.status }), { status: response.status, headers: corsHeaders });
      }

      if (!hasActiveSub) {
        await env.DB.prepare("UPDATE users SET credits = credits - 1 WHERE id = ?").bind(session.user_id).run();
      }

      const buffer = await response.arrayBuffer();
      return new Response(buffer, { headers: { "Content-Type": "image/png", "Access-Control-Allow-Origin": "*" } });
    }

    // PayPal: 创建订单
    if (url.pathname === "/api/paypal/create-order") {
      const token = request.headers.get("Authorization");
      if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      token = token.replace("Bearer ", "");
      const { plan } = await request.json();
      const planData = PLANS[plan];
      if (!planData) return new Response(JSON.stringify({ error: "Invalid plan" }), { status: 400, headers: corsHeaders });

      // 检查环境变量
      if (!env.PAYPAL_API || !env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) {
        return new Response(JSON.stringify({ error: "环境变量未设置", api: !!env.PAYPAL_API, clientId: !!env.PAYPAL_CLIENT_ID, secret: !!env.PAYPAL_CLIENT_SECRET }), { status: 500, headers: corsHeaders });
      }

      try {
        // 获取 PayPal 访问令牌
        const authResponse = await fetch(env.PAYPAL_API + "/v1/oauth2/token", {
          method: "POST",
          headers: { 
            "Authorization": "Basic " + btoa(env.PAYPAL_CLIENT_ID + ":" + env.PAYPAL_CLIENT_SECRET), 
            "Content-Type": "application/x-www-form-urlencoded" 
          },
          body: "grant_type=client_credentials"
        });
        const authData = await authResponse.json();
        
        if (!authData.access_token) {
          return new Response(JSON.stringify({ error: "PayPal认证失败", details: authData }), { status: 500, headers: corsHeaders });
        }

        // 创建订单
        const orderResponse = await fetch(env.PAYPAL_API + "/v2/checkout/orders", {
          method: "POST",
          headers: { "Authorization": "Bearer " + authData.access_token, "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [{ amount: { currency_code: "USD", value: planData.price.toFixed(2) }, description: planData.credits + " credits" }]
          })
        });
        const orderData = await orderResponse.json();
        
        if (!orderData.id) {
          return new Response(JSON.stringify({ error: "创建订单失败", details: orderData }), { status: 500, headers: corsHeaders });
        }
        
        return new Response(JSON.stringify({ orderId: orderData.id }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // PayPal: 确认支付
    if (url.pathname === "/api/paypal/capture-order") {
      const token = request.headers.get("Authorization");
      if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      token = token.replace("Bearer ", "");
      const { orderId } = await request.json();
      const session = await env.DB.prepare("SELECT * FROM sessions WHERE id = ?").bind(token).first();
      if (!session) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: corsHeaders });

      const authResponse = await fetch(env.PAYPAL_API + "/v1/oauth2/token", {
        method: "POST",
        headers: { 
          "Authorization": "Basic " + btoa(env.PAYPAL_CLIENT_ID + ":" + env.PAYPAL_CLIENT_SECRET), 
          "Content-Type": "application/x-www-form-urlencoded" 
        },
        body: "grant_type=client_credentials"
      });
      const authData = await authResponse.json();

      const captureResponse = await fetch(env.PAYPAL_API + "/v2/checkout/orders/" + orderId + "/capture", {
        method: "POST",
        headers: { "Authorization": "Bearer " + authData.access_token, "Content-Type": "application/json" }
      });
      const captureData = await captureResponse.json();

      if (captureData.status === "COMPLETED") {
        let credits = 0;
        for (var p in PLANS) {
          if (Math.abs(PLANS[p].price - parseFloat(captureData.purchase_units[0].payments.captures[0].amount.value)) < 0.01) {
            credits = PLANS[p].credits;
            break;
          }
        }
        if (credits > 0) {
          await env.DB.prepare("UPDATE users SET credits = credits + ? WHERE id = ?").bind(credits, session.user_id).run();
        }
        return new Response(JSON.stringify({ success: true, credits: credits }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: "Payment failed" }), { status: 400, headers: corsHeaders });
    }

    // 404
    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
  }
};
