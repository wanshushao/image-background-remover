export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    // Call BRIA RMBG 1.4 on HuggingFace
    const initRes = await fetch('https://bria-ai-rmbg-1-4.hf.space/call/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [{ path: image }] }),
      signal: AbortSignal.timeout(30000),
    });

    if (!initRes.ok) throw new Error(`HF init failed: ${initRes.status}`);

    const { event_id } = await initRes.json();
    if (!event_id) throw new Error('No event_id returned');

    // Poll for result via SSE
    const resultRes = await fetch(
      `https://bria-ai-rmbg-1-4.hf.space/call/image/${event_id}`,
      { signal: AbortSignal.timeout(30000) }
    );

    if (!resultRes.ok) throw new Error(`HF poll failed: ${resultRes.status}`);

    const text = await resultRes.text();
    const dataLine = text.split('\n').find(l => l.startsWith('data:'));
    if (!dataLine) throw new Error('No data in response');

    const parsed = JSON.parse(dataLine.slice(5));
    const url = parsed?.[0]?.url;
    if (!url) throw new Error('No result URL');

    // Fetch result image and convert to base64
    const imgRes = await fetch(url);
    const buffer = await imgRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    return Response.json({ result: `data:image/png;base64,${base64}` });
  } catch (err) {
    console.error('[remove-bg]', err);
    return Response.json(
      { error: 'Processing failed. Please try again.' },
      { status: 500 }
    );
  }
}
