export default {
  async fetch(request, env) {
    // 处理 CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { imageBase64 } = await request.json();
      if (!imageBase64) {
        return Response.json({ error: 'No image provided' }, { status: 400 });
      }

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': env.REMOVE_BG_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_file_b64: imageBase64, size: 'auto' }),
      });

      if (!response.ok) {
        const err = await response.json();
        return Response.json({ error: err.errors?.[0]?.title || 'API error' }, { status: response.status });
      }

      const buffer = await response.arrayBuffer();
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
  },
};
