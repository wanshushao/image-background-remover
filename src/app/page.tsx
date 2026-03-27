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

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('https://green-glade-44b7.m15629127687.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      {/* Header */}
      <div className="w-full max-w-5xl mb-8 mt-4 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">✨ 图像背景一键去除</h1>
        <p className="text-gray-500 text-lg">上传图片，AI 自动去除背景，秒级完成</p>
      </div>

      {/* Upload Area (no image yet) */}
      {!preview && (
        <div
          className="w-full max-w-2xl bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div className="text-6xl mb-4">🖼️</div>
          <p className="text-gray-700 text-xl font-medium mb-2">点击或拖拽图片到此处</p>
          <p className="text-gray-400">支持 JPG、PNG、WebP，最大 10MB</p>
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-input" />
        </div>
      )}

      {error && (
        <div className="w-full max-w-5xl mt-4 bg-red-50 border border-red-300 text-red-600 rounded-lg p-4 text-center">
          {error}
        </div>
      )}

      {/* Side by Side Comparison */}
      {preview && (
        <div className="w-full max-w-5xl">
          {/* 两个图片框 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 原始图片 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center">
              <h3 className="text-gray-600 font-semibold text-center mb-3">📷 原始图片</h3>
              <div className="bg-gray-50 rounded-xl overflow-hidden w-full aspect-square flex items-center justify-center">
                <img src={preview} alt="原始图片" className="max-w-full max-h-full object-contain" />
              </div>
              {/* 上传图片按钮 居中 在图片框下面 */}
              <div className="mt-4 w-full flex justify-center">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-input2" />
                <button
                  onClick={() => document.getElementById('file-input2')?.click()}
                  className="px-8 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm"
                >
                  🔄 重新上传
                </button>
              </div>
            </div>

            {/* 去除背景后 */}
            <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center">
              <h3 className="text-gray-600 font-semibold text-center mb-3">✨ 去除背景后</h3>
              <div
                className="rounded-xl overflow-hidden w-full aspect-square flex items-center justify-center"
                style={{ background: 'repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 0 0 / 20px 20px' }}
              >
                {result ? (
                  <img src={result} alt="去除背景后" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center text-gray-400">
                    {loading ? (
                      <div>
                        <div className="text-4xl mb-2">⚙️</div>
                        <p>AI 处理中...</p>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">👆</div>
                        <p>点击去除背景</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* 去除背景按钮 居中 在图片框下面 */}
              <div className="mt-4 w-full flex justify-center">
                <button
                  onClick={handleRemoveBackground}
                  disabled={loading || !!result}
                  className="px-8 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:bg-gray-300 transition font-medium shadow-sm"
                >
                  {loading ? '⚙️ 处理中...' : result ? '✅ 已完成' : '🚀 去除背景'}
                </button>
              </div>
            </div>
          </div>

          {/* 下载按钮 居中 在两个框下面中间 */}
          {result && (
            <div className="mt-6 flex justify-center">
              <a
                href={result}
                download="result.png"
                className="px-12 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium shadow-sm text-lg"
              >
                💾 下载图片
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
