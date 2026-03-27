// API Worker - OAuth 2.0 服务端流程
// 环境变量：GOOGLE_CLIENT_SECRET, REMOVE_BG_API_KEY
// D1 绑定：DB

const GOOGLE_CLIENT_ID = '1042944429385-7ogkal95ahbinqh1p13tri95eke8mr5j.apps.googleusercontent.com';
const REDIRECT_URI = 'https://image-bg-api.m15629127687.workers.dev/api/auth/callback';
const FRONTEND_URL = 'https://image-background-remover-8jc.pages.dev';
const FREE_CREDITS = 3;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': FRONTEND_URL,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

function corsResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// 生成随机 session token
function generateToken(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) result += chars[array[i] % chars.length];
  return result;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // GET /api/auth/login - 跳转到 Google 授权页
    if (path === '/api/auth/login') {
      const state = generateToken(16);
      const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      googleAuthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      googleAuthUrl.searchParams.set('response_type', 'code');
      googleAuthUrl.searchParams.set('scope', 'openid email profile');
      googleAuthUrl.searchParams.set('state', state);
      googleAuthUrl.searchParams.set('access_type', 'offline');

      // 存 state 到 DB（防 CSRF）
      await env.DB.prepare('INSERT INTO oauth_states (state, created_at) VALUES (?, ?)')
        .bind(state, Date.now()).run();

      return Response.redirect(googleAuthUrl.toString(), 302);
    }

    // GET /api/auth/callback - Google 回调
    if (path === '/api/auth/callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        return htmlResponse(`<script>window.location='${FRONTEND_URL}?error=login_cancelled'</script>`);
      }

      // 验证 state
      const stateRow = await env.DB.prepare('SELECT * FROM oauth_states WHERE state = ?').bind(state).first();
      if (!stateRow) {
        return htmlResponse(`<script>window.location='${FRONTEND_URL}?error=invalid_state'</script>`);
      }
      await env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

      // 用 code 换 token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        return htmlResponse(`<script>window.location='${FRONTEND_URL}?error=token_failed'</script>`);
      }

      // 获取用户信息
      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userInfo = await userRes.json();

      // 查找或创建用户
      let user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(userInfo.email).first();
      if (!user) {
        await env.DB.prepare(
          'INSERT INTO users (email, name, avatar, credits, subscription) VALUES (?, ?, ?, ?, ?)'
        ).bind(userInfo.email, userInfo.name, userInfo.picture, FREE_CREDITS, 'free').run();
        user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(userInfo.email).first();
      } else {
        await env.DB.prepare('UPDATE users SET name = ?, avatar = ? WHERE email = ?')
          .bind(userInfo.name, userInfo.picture, userInfo.email).run();
      }

      // 生成 session token
      const sessionToken = generateToken(48);
      const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7天

      await env.DB.prepare(
        'INSERT INTO sessions (token, user_email, expires_at) VALUES (?, ?, ?)'
      ).bind(sessionToken, userInfo.email, expiresAt).run();

      // 跳回前端，携带 token
      return htmlResponse(`
        <script>
          localStorage.setItem('session_token', '${sessionToken}');
          localStorage.setItem('user_email', '${userInfo.email}');
          localStorage.setItem('user_name', '${userInfo.name}');
          localStorage.setItem('user_avatar', '${userInfo.picture}');
          window.location = '${FRONTEND_URL}';
        </script>
      `);
    }

    // GET /api/user - 获取用户信息（需要 session）
    if (path === '/api/user' && request.method === 'GET') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) return corsResponse({ error: '未登录' }, 401);

      const session = await env.DB.prepare(
        'SELECT * FROM sessions WHERE token = ? AND expires_at > ?'
      ).bind(token, Date.now()).first();
      if (!session) return corsResponse({ error: '登录已过期' }, 401);

      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(session.user_email).first();
      if (!user) return corsResponse({ error: '用户不存在' }, 404);

      return corsResponse({
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        credits: user.credits,
        subscription: user.subscription,
      });
    }

    // POST /api/remove-bg - 去背景
    if (path === '/api/remove-bg' && request.method === 'POST') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (!token) return corsResponse({ error: '请先登录' }, 401);

      const session = await env.DB.prepare(
        'SELECT * FROM sessions WHERE token = ? AND expires_at > ?'
      ).bind(token, Date.now()).first();
      if (!session) return corsResponse({ error: '登录已过期，请重新登录' }, 401);

      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(session.user_email).first();
      if (!user) return corsResponse({ error: '用户不存在' }, 404);
      if (user.credits <= 0) return corsResponse({ error: '额度不足，请购买更多次数', code: 'NO_CREDITS' }, 403);

      const { imageBase64 } = await request.json();
      if (!imageBase64) return corsResponse({ error: '没有图片' }, 400);

      const API_KEY = env.REMOVE_BG_API_KEY || 'rBGxfdAQrf4tUny7zx7DR1Qc';
      const binaryStr = atob(imageBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const formData = new FormData();
      formData.append('image_file', new Blob([bytes], { type: 'image/jpeg' }), 'image.jpg');
      formData.append('size', 'auto');

      const bgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': API_KEY },
        body: formData,
      });

      if (!bgRes.ok) {
        const err = await bgRes.json();
        return corsResponse({ error: err.errors?.[0]?.title || '处理失败' }, 500);
      }

      await env.DB.prepare('UPDATE users SET credits = credits - 1 WHERE email = ?').bind(user.email).run();

      const buffer = await bgRes.arrayBuffer();
      const base64Result = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      return corsResponse({ result: base64Result, credits_remaining: user.credits - 1 });
    }

    // POST /api/logout - 退出登录
    if (path === '/api/logout' && request.method === 'POST') {
      const token = request.headers.get('Authorization')?.replace('Bearer ', '');
      if (token) {
        await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
      }
      return corsResponse({ success: true });
    }

    return corsResponse({ error: 'Not found' }, 404);
  },
};
