'use client';

import { useState, useCallback, useRef } from 'react';

type State = 'idle' | 'loading' | 'done' | 'error';

export default function Home() {
  const [state, setState] = useState<State>('idle');
  const [original, setOriginal] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const process = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please upload an image file (JPG, PNG, WEBP).');
      setState('error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File too large. Max size is 5MB.');
      setState('error');
      return;
    }

    setState('loading');
    setResult(null);
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setOriginal(base64);

      try {
        const res = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setResult(data.result);
        setState('done');
      } catch (err: any) {
        setErrorMsg(err.message || 'Processing failed. Please try again.');
        setState('error');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }, [process]);

  const reset = () => {
    setState('idle');
    setOriginal(null);
    setResult(null);
    setErrorMsg('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result;
    a.download = 'removed-background.png';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <span className="text-xl">✂️</span>
          <span className="font-bold text-slate-900 text-lg tracking-tight">BGRemover</span>
          <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Free</span>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 leading-tight">
            Remove Image Background<br className="hidden sm:block" /> Free & Instantly
          </h1>
          <p className="text-slate-500 text-lg">No signup required · 100% free · Powered by AI</p>
        </div>

        {/* Upload Zone */}
        {state === 'idle' && (
          <div
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-3xl p-16 text-center cursor-pointer
              hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-200 group"
          >
            <div className="text-6xl mb-5 group-hover:scale-110 transition-transform">🖼️</div>
            <p className="text-slate-700 text-xl font-medium mb-2">Drop your image here</p>
            <p className="text-slate-400 mb-6">or click to browse files</p>
            <span className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors">
              Upload Image
            </span>
            <p className="text-slate-400 text-sm mt-4">JPG, PNG, WEBP · Max 5MB</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f); }}
            />
          </div>
        )}

        {/* Loading */}
        {state === 'loading' && (
          <div className="text-center py-20">
            {original && (
              <img src={original} alt="Uploading" className="w-40 h-40 object-cover rounded-2xl mx-auto mb-6 opacity-50" />
            )}
            <div className="inline-flex items-center gap-3 text-slate-600">
              <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-lg">Removing background...</span>
            </div>
            <p className="text-slate-400 text-sm mt-2">This may take up to 30 seconds</p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">😕</div>
            <p className="text-red-500 font-medium mb-6">{errorMsg}</p>
            <button onClick={reset} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-medium transition-colors">
              Try Again
            </button>
          </div>
        )}

        {/* Result */}
        {state === 'done' && original && result && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Original */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Original</p>
                <img src={original} alt="Original" className="w-full rounded-xl object-contain max-h-72" />
              </div>
              {/* Result */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Background Removed</p>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: 'repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 0 0 / 16px 16px',
                  }}
                >
                  <img src={result} alt="Result" className="w-full object-contain max-h-72" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={download}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <span>⬇️</span> Download PNG
              </button>
              <button
                onClick={reset}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-3 rounded-xl font-semibold transition-colors"
              >
                Try Another Image
              </button>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '📤', step: '1', title: 'Upload', desc: 'Drop your image or click to browse. Supports JPG, PNG, and WEBP.' },
              { icon: '🤖', step: '2', title: 'AI Removes BG', desc: 'Our AI model instantly detects and removes the background.' },
              { icon: '💾', step: '3', title: 'Download', desc: 'Get your transparent PNG file for free, no watermark.' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
                <div className="text-4xl mb-3">{item.icon}</div>
                <div className="text-xs font-bold text-blue-500 mb-1">STEP {item.step}</div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Use cases */}
        <div className="mt-16 bg-slate-50 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-6">Perfect For</h2>
          <div className="flex flex-wrap justify-center gap-3">
            {['Product Photos', 'Profile Pictures', 'ID Photos', 'Logo Design', 'E-commerce', 'Social Media'].map((tag) => (
              <span key={tag} className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-full text-sm font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        © 2026 BGRemover · Free Image Background Remover Online
      </footer>
    </div>
  );
}
