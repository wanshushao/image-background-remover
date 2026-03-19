export const runtime = 'edge';

const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY!;

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    // Strip data URL prefix to get raw base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVEBG_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_base64: base64Data,
        size: 'auto',
        format: 'png',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as any)?.errors?.[0]?.title || `remove.bg error: ${res.status}`;
      throw new Error(msg);
    }

    const buffer = await res.arrayBuffer();
    const base64Result = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    return Response.json({ result: `data:image/png;base64,${base64Result}` });
  } catch (err: any) {
    console.error('[remove-bg]', err);
    return Response.json(
      { error: err.message || 'Processing failed. Please try again.' },
      { status: 500 }
    );
  }
}
