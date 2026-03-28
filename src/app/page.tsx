'use client';

import { useState, useEffect } from 'react';

const API_BASE = 'https://image-bg-auth.m15629127687.workers.dev';

interface User {
  email: string;
  name: string;
  avatar: string;
  credits: number;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // 处理 OAuth 回调带回来的 token
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('session_token', urlToken);
      // 清理 URL 里的 token 参数
      window.history.replaceState({}, '', '/');
    }

    const token = urlToken || localStorage.getItem('session_token');
    if (token) {
      fetch(`${API_BASE}/api/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.email) setUser(data);
        })
        .catch(() => localStorage.removeItem('session_token'));
    }
  }, []);

  const handleLogin = async () => {
    const res = await fetch(`${API_BASE}/api/auth/google`);
    const { authUrl } = await res.json();
    window.location.href = authUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('session_token');
    setUser(null);
  };

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
    
    if (!user) {
      setError('请先登录');
      return;
    }

    if (user.credits <= 0) {
      setError('额度不足，请充值');
      return;
    }

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

      const token = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/api/remove-bg`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (response.ok) {
        const blob = await response.blob();
        setResult(URL.createObjectURL(blob));
        setUser(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
      } else {
        const err = await response.json();
        setError(err.error || '处理失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">✨ 图像背景去除</h1>
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">剩余 {user.credits} 次</span>
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700">退出</button>
          </div>
        ) : (
          <button onClick={handleLogin} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Google 登录
          </button>
        )}
      </nav>

      {/* 主内容 */}
      <div className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-5xl mb-6 text-center">
          <p className="text-gray-500 text-lg">上传图片，AI 自动去除背景，秒级完成</p>
        </div>

        {error && (
          <div className="w-full max-w-5xl mb-4 bg-red-50 border border-red-300 text-red-600 rounded-lg p-4 text-center">
            {error}
          </div>
        )}

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

        {preview && (
          <div className="w-full max-w-5xl">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center">
                <h3 className="text-gray-600 font-semibold text-center mb-3">📷 原始图片</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden w-full aspect-square flex items-center justify-center">
                  <img src={preview} alt="原始图片" className="max-w-full max-h-full object-contain" />
                </div>
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
                        <div><div className="text-4xl mb-2">⚙️</div><p>AI 处理中...</p></div>
                      ) : (
                        <div><div className="text-4xl mb-2">👆</div><p>点击去除背景</p></div>
                      )}
                    </div>
                  )}
                </div>
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
    </div>
  );
}
