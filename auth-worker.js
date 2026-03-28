// Auth Worker - Google OAuth + User Management
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
      
      if (url.pathname === '/api/remove-bg') {
        return handleRemoveBg(request, env, corsHeaders);
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500, headers: corsHeaders });
    }
  },
};

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
    if (!tokens.access_token) throw new Error('Token exchange failed');

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

    return new Response(`<script>localStorage.setItem('session_token','${sessionToken}');window.location.href='https://image-background-remover-8jc.pages.dev/';</script>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (e) {
    return new Response(`<h1>登录失败：${e.message}</h1>`, { 
      status: 500, 
      headers: { 'Content-Type': 'text/html; charset=utf-8' } 
    });
  }
}

async function handleGetUser(request, env, corsHeaders) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const token = auth.substring(7);
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').bind(
    token, Math.floor(Date.now() / 1000)
  ).first();

  if (!session) {
    return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders });
  }

  const user = await env.DB.prepare('SELECT email, name, avatar, credits, subscription FROM users WHERE email = ?').bind(
    session.user_email
  ).first();

  return Response.json(user, { headers: corsHeaders });
}

async function handleRemoveBg(request, env, corsHeaders) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const token = auth.substring(7);
  const session = await env.DB.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?').bind(
    token, Math.floor(Date.now() / 1000)
  ).first();

  if (!session) {
    return Response.json({ error: 'Invalid session' }, { status: 401, headers: corsHeaders });
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(session.user_email).first();
  
  if (user.credits <= 0) {
    return Response.json({ error: 'No credits' }, { status: 403, headers: corsHeaders });
  }

  const { imageBase64 } = await request.json();
  const response = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: {
      'X-Api-Key': env.REMOVE_BG_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ image_file_b64: imageBase64, size: 'auto' }),
  });

  if (!response.ok) {
    return Response.json({ error: 'Remove.bg API error' }, { status: response.status, headers: corsHeaders });
  }

  await env.DB.prepare('UPDATE users SET credits = credits - 1, updated_at = ? WHERE email = ?').bind(
    Math.floor(Date.now() / 1000), session.user_email
  ).run();

  await env.DB.prepare('INSERT INTO usage_logs (user_email, action) VALUES (?, ?)').bind(
    session.user_email, 'remove_bg'
  ).run();

  const buffer = await response.arrayBuffer();
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
