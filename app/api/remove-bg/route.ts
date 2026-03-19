export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert base64 to blob
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const blob = new Blob([binaryData], { type: 'image/png' });

    const formData = new FormData();
    formData.append('image', blob, 'image.png');

    // Call HuggingFace REMBG Space API
    const hfResponse = await fetch(
      'https://not-lain-background-removal.hf.space/call/image',
      {
        method: 'POST',
        body: JSON.stringify({ data: [{ path: image }] }),
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!hfResponse.ok) {
      throw new Error('HuggingFace API error');
    }

    const hfData = await hfResponse.json();
    const eventId = hfData.event_id;

    // Poll for result
    const resultResponse = await fetch(
      `https://not-lain-background-removal.hf.space/call/image/${eventId}`,
      { signal: AbortSignal.timeout(30000) }
    );

    const resultText = await resultResponse.text();
    const lines = resultText.split('\n').filter(Boolean);
    let resultData = null;
    for (const line of lines) {
      if (line.startsWith('data:')) {
        resultData = JSON.parse(line.slice(5));
        break;
      }
    }

    if (!resultData || !resultData[0]?.url) {
      throw new Error('No result from API');
    }

    // Fetch the result image and convert to base64
    const imgResponse = await fetch(resultData[0].url);
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64Result = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));

    return Response.json({ result: `data:image/png;base64,${base64Result}` });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Processing failed. Please try again.' }, { status: 500 });
  }
}
