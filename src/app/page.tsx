'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过 10MB');
        return;
      }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult('');
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过 10MB');
        return;
      }
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setResult('');
      setError('');
    }
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('image_file', file);
    formData.append('size', 'auto');

    try {
      const response = await fetch('https://green-glade-44b7.m15629127687.workers.dev/', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        setResult(URL.createObjectURL(blob));
      } else {
        setError('处理失败，请重试');
      }
    } catch {
      setError('网络错误，请检查网络后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex flex-col items-center p-6">
      {/* Header */}
      <div className="w-full max-w-5xl mb-8 mt-4 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">✨ 图像背景一键去除</h1>
        <p className="text-purple-200 text-lg">上传图片，AI 自动去除背景，秒级完成</p>
      </div>

      {/* Upload Area */}
      {!preview && (
        <div
          className="w-full max-w-2xl bg-white/10 backdrop-blur-lg rounded-2xl p-12 text-center border-2 border-dashed border-white/40 cursor-pointer hover:bg-white/20 transition"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div className="text-6xl mb-4">🖼️</div>
          <p className="text-white text-xl font-medium mb-2">点击或拖拽图片到此处</p>
          <p className="text-purple-200">支持 JPG、PNG、WebP，最大 10MB</p>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-input" />
        </div>
      )}

      {error && (
        <div className="w-full max-w-5xl mt-4 bg-red-500/20 border border-red-400 text-white rounded-lg p-4 text-center">
          {error}
        </div>
      )}

      {/* Side by Side Comparison */}
      {preview && (
        <div className="w-full max-w-5xl">
          <div className="grid grid-cols-2 gap-6">
            {/* Original */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4">
              <h3 className="text-white font-semibold text-center mb-3">📷 原始图片</h3>
              <div className="bg-white/5 rounded-xl overflow-hidden aspect-square flex items-center justify-center">
                <img src={preview} alt="原始图片" className="max-w-full max-h-full object-contain" />
              </div>
            </div>

            {/* Result */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4">
              <h3 className="text-white font-semibold text-center mb-3">✨ 去除背景后</h3>
              <div
                className="rounded-xl overflow-hidden aspect-square flex items-center justify-center"
                style={{ background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 20px 20px' }}
              >
                {result ? (
                  <img src={result} alt="去除背景后" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-gray-400">
                    {loading ? (
                      <div>
                        <div className="text-4xl mb-2 animate-spin">⚙️</div>
                        <p>AI 处理中...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">👆</div>
                        <p>点击下方按钮开始</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => { setFile(null); setPreview(''); setResult(''); setError(''); }}
              className="flex-1 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition font-medium"
            >
              🔄 重新选择
            </button>
            <button
              onClick={handleRemoveBackground}
              disabled={loading || !!result}
              className="flex-2 flex-grow-[2] py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:bg-gray-500 transition font-medium text-lg"
            >
              {loading ? '⚙️ AI 处理中...' : result ? '✅ 处理完成' : '🚀 去除背景'}
            </button>
            {result && (
              <a
                href={result}
                download="result.png"
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium text-center"
              >
                💾 下载图片
              </a>
            )}
          </div>

          {/* Re-upload */}
          <div className="mt-4 text-center">
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-input2" />
          </div>
        </div>
      )}
    </div>
  );
}
