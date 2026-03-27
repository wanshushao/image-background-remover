// API Worker - 用户管理、额度、支付
// 绑定：DB (D1 数据库), REMOVE_BG_API_KEY (环境变量)

const GOOGLE_CLIENT_ID = '1042944429385-7ogkal95ahbinqh1p13tri95eke8mr5j.apps.googleusercontent.com';
const FREE_CREDITS = 3; // 新用户免费次数

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function corsResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// 验证 Google ID Token
async function verifyGoogleToken(token) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.aud !== GOOGLE_CLIENT_ID) return null;
  return { email: data.email, name: data.name, avatar: data.picture, sub: data.sub };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // POST /api/login - Google 登录 / 注册
    if (path === '/api/login' && request.method === 'POST') {
      const { token } = await request.json();
      const user = await verifyGoogleToken(token);
      if (!user) return corsResponse({ error: '无效的 Google Token' }, 401);

      // 查找或创建用户
      let row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(user.email).first();
      if (!row) {
        await env.DB.prepare(
          'INSERT INTO users (email, name, avatar, credits, subscription) VALUES (?, ?, ?, ?, ?)'
        ).bind(user.email, user.name, user.avatar, FREE_CREDITS, 'free').run();
        row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(user.email).first();
      } else {
        // 更新头像和名字
        await env.DB.prepare('UPDATE users SET name = ?, avatar = ? WHERE email = ?')
          .bind(user.name, user.avatar, user.email).run();
      }

      return corsResponse({
        email: row.email,
        name: user.name,
        avatar: user.avatar,
        credits: row.credits,
        subscription: row.subscription,
      });
    }

    // POST /api/remove-bg - 去背景（需要登录 + 额度）
    if (path === '/api/remove-bg' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) return corsResponse({ error: '请先登录' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const user = await verifyGoogleToken(token);
      if (!user) return corsResponse({ error: '登录已过期，请重新登录' }, 401);

      // 检查额度
      const row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(user.email).first();
      if (!row) return corsResponse({ error: '用户不存在' }, 404);
      if (row.credits <= 0) return corsResponse({ error: '额度不足，请购买更多次数', code: 'NO_CREDITS' }, 403);

      // 获取图片
      const { imageBase64 } = await request.json();
      if (!imageBase64) return corsResponse({ error: '没有图片' }, 400);

      // 调用 Remove.bg
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

      // 扣除额度
      await env.DB.prepare('UPDATE users SET credits = credits - 1 WHERE email = ?').bind(user.email).run();

      const buffer = await bgRes.arrayBuffer();
      const base64Result = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      return corsResponse({
        result: base64Result,
        credits_remaining: row.credits - 1,
      });
    }

    // GET /api/user - 获取用户信息
    if (path === '/api/user' && request.method === 'GET') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) return corsResponse({ error: '未登录' }, 401);

      const token = authHeader.replace('Bearer ', '');
      const user = await verifyGoogleToken(token);
      if (!user) return corsResponse({ error: '登录已过期' }, 401);

      const row = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(user.email).first();
      if (!row) return corsResponse({ error: '用户不存在' }, 404);

      return corsResponse({
        email: row.email,
        name: row.name,
        avatar: row.avatar,
        credits: row.credits,
        subscription: row.subscription,
      });
    }

    return corsResponse({ error: 'Not found' }, 404);
  },
};
