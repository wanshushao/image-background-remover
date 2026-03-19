'use client';

import { useState, useCallback } from 'react';

export default function Home() {
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processImage = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Max 5MB.');
      return;
    }

    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setOriginal(base64);
      setLoading(true);

      try {
        const res = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult(data.result);
      } catch (err) {
        setError('Processing failed. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processImage(file);
  }, [processImage]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const downloadResult = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = 'removed-bg.png';
    a.click();
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
          <span className="text-2xl">✂️</span>
          <span className="font-bold text-xl text-gray-900">BG Remover</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Remove Image Background Free & Instantly
          </h1>
          <p className="text-gray-500 text-lg">No signup required. 100% free. Powered by AI.</p>
        </div>

        {/* Upload Area */}
        {!original && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className="text-5xl mb-4">🖼️</div>
            <p className="text-gray-600 text-lg mb-2">Drag & drop your image here</p>
            <p className="text-gray-400 text-sm mb-4">or click to browse</p>
            <p className="text-gray-400 text-xs">Supports JPG, PNG, WEBP · Max 5MB</p>
            <input
              id="fileInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Removing background... this may take up to 30s</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-center mb-6">
            {error}
          </div>
        )}

        {/* Result */}
        {original && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-sm text-gray-400 mb-2 font-medium">Original</p>
                <img src={original} alt="Original" className="w-full rounded-lg object-contain max-h-80" />
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-sm text-gray-400 mb-2 font-medium">Background Removed</p>
                {result ? (
                  <div
                    className="rounded-lg overflow-hidden max-h-80 flex items-center justify-center"
                    style={{ background: 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%) 0 0 / 20px 20px' }}
                  >
                    <img src={result} alt="Result" className="w-full object-contain max-h-80" />
                  </div>
                ) : (
                  <div className="w-full h-64 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                    Waiting...
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              {result && (
                <button
                  onClick={downloadResult}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                >
                  Download PNG
                </button>
              )}
              <button
                onClick={() => { setOriginal(null); setResult(null); setError(null); }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-medium transition-colors"
              >
                Try Another
              </button>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-20 grid grid-cols-3 gap-8 text-center">
          {[
            { icon: '📤', title: 'Upload', desc: 'Drop your image or click to browse' },
            { icon: '🤖', title: 'AI Removes BG', desc: 'Our AI instantly removes the background' },
            { icon: '💾', title: 'Download', desc: 'Get your transparent PNG for free' },
          ].map((step) => (
            <div key={step.title} className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-4xl mb-3">{step.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{step.title}</h3>
              <p className="text-gray-500 text-sm">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20 py-6 text-center text-gray-400 text-sm">
        © 2026 BG Remover · Free Image Background Remover
      </footer>
    </main>
  );
}
