'use client';

import { useState } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult('');
    }
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('image_file', file);
    formData.append('size', 'auto');

    try {
      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': 'rBGxfdAQrf4tUny7zx7DR1Qc',
        },
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        setResult(URL.createObjectURL(blob));
      } else {
        alert('处理失败，请重试');
      }
    } catch (error) {
      alert('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-900 flex flex-col items-center justify-center p-6">
      <h1 className="text-4xl font-bold text-white mb-8">图像背景一键去除</h1>
      
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="block w-full py-4 px-6 bg-white text-purple-600 rounded-lg text-center cursor-pointer hover:bg-gray-100 transition"
        >
          选择图片
        </label>

        {preview && (
          <div className="mt-6">
            <img src={preview} alt="预览" className="w-full rounded-lg" />
            <button
              onClick={handleRemoveBackground}
              disabled={loading}
              className="mt-4 w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? '处理中...' : '去除背景'}
            </button>
          </div>
        )}

        {result && (
          <div className="mt-6">
            <h3 className="text-white text-lg mb-2">处理结果：</h3>
            <img src={result} alt="结果" className="w-full rounded-lg bg-white/20 p-2" />
            <a
              href={result}
              download="result.png"
              className="mt-4 block w-full py-3 bg-blue-500 text-white rounded-lg text-center hover:bg-blue-600"
            >
              下载图片
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
