'use client';

import { useState, useEffect } from 'react';

const API_BASE = 'https://image-bg-auth.m15629127687.workers.dev';

interface User {
  email: string;
  name: string;
  avatar: string;
  credits: number;
}

// 定价套餐
const PLANS = [
  {
    id: 'starter', name: 'Starter', credits: 10, price: 4.99, unit: 0.50,
    badge: null,
    features: ['10 HD background removals', 'JPG / PNG / WebP support', 'Commercial use allowed', 'Never expires'],
  },
  {
    id: 'popular', name: 'Popular', credits: 30, price: 12.99, unit: 0.43,
    badge: 'Most Popular',
    features: ['30 HD background removals', 'JPG / PNG / WebP support', 'Commercial use allowed', 'Never expires', 'Save 14% vs Starter'],
  },
  {
    id: 'pro', name: 'Pro Pack', credits: 80, price: 29.99, unit: 0.37,
    badge: 'Best Value',
    features: ['80 HD background removals', 'JPG / PNG / WebP support', 'Commercial use allowed', 'Never expires', 'Save 26% vs Starter'],
  },
];

const SUBSCRIPTIONS = [
  {
    id: 'basic', name: 'Basic', credits: 60, price: 7.99,
    badge: null,
    features: ['60 credits / month', 'JPG / PNG / WebP support', 'Commercial use allowed', 'Cancel anytime'],
  },
  {
    id: 'unlimited', name: 'Unlimited', credits: 9999, price: 19.99,
    badge: 'Best Value',
    features: ['Unlimited removals / month', 'Max 50 images / day', 'JPG / PNG / WebP support', 'Commercial use allowed', 'Cancel anytime'],
  },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 弹窗状态
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [purchaseTab, setPurchaseTab] = useState<'credits' | 'subscription'>('credits');

  useEffect(() => {
    // 处理 OAuth 回调带回来的 token
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('session_token', urlToken);
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
    setShowProfileDrawer(false);
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

    // 未登录 → 弹出登录引导
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    // 额度为0 → 强制弹出购买弹窗
    if (user.credits <= 0) {
      setShowPurchaseModal(true);
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
        if (err.error === 'No credits') {
          setShowPurchaseModal(true);
        } else {
          setError(err.error || '处理失败');
        }
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
        <h1 className="text-xl font-bold text-gray-800">✨ BgRemover</h1>
        {user ? (
          <div className="flex items-center gap-3">
            {/* 剩余次数 - 点击打开购买 */}
            <button
              onClick={() => setShowPurchaseModal(true)}
              className={`text-sm px-3 py-1 rounded-full font-medium transition ${
                user.credits <= 1
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {user.credits <= 1 ? '⚠️' : '✅'} 剩余 {user.credits} 次
            </button>
            {/* 头像 - 点击打开个人中心 */}
            <button onClick={() => setShowProfileDrawer(true)}>
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full hover:ring-2 hover:ring-blue-400 transition" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
          >
            Google 登录
          </button>
        )}
      </nav>

      {/* 剩余1次时顶部提示条 */}
      {user && user.credits === 1 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex items-center justify-between">
          <span className="text-yellow-700 text-sm">⚠️ 仅剩 1 次额度，用完后需要购买才能继续</span>
          <button
            onClick={() => setShowPurchaseModal(true)}
            className="text-sm text-yellow-700 underline hover:text-yellow-900"
          >
            立即补充 →
          </button>
        </div>
      )}

      {/* 主内容 */}
      <div className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-5xl mb-6 text-center">
          <p className="text-gray-500 text-lg">上传图片，AI 自动去除背景，秒级完成</p>
          {!user && (
            <p className="text-blue-500 text-sm mt-1">
              💡 <button onClick={handleLogin} className="underline hover:text-blue-700">登录即送 3 次免费额度</button>，无需信用卡
            </p>
          )}
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

      {/* ===== 登录引导弹窗 ===== */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">🎁</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">登录即送 3 次免费额度</h2>
            <p className="text-gray-500 text-sm mb-6">使用 Google 账号一键登录，无需信用卡，立即开始去除背景</p>
            <button
              onClick={() => { setShowLoginModal(false); handleLogin(); }}
              className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-medium flex items-center justify-center gap-2"
            >
              <span>🔑</span> Google 登录 · 免费获得 3 次
            </button>
            <button onClick={() => setShowLoginModal(false)} className="mt-3 text-sm text-gray-400 hover:text-gray-600">
              稍后再说
            </button>
          </div>
        </div>
      )}

      {/* ===== 购买弹窗 ===== */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPurchaseModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-1">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Simple, Transparent Pricing</h2>
                <p className="text-gray-400 text-xs mt-0.5">Start free · No subscription required · Credits never expire</p>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl mt-1">×</button>
            </div>

            {/* Tab 切换 */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-5 mt-4">
              <button
                onClick={() => setPurchaseTab('credits')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${purchaseTab === 'credits' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
              >
                Credit Packs
              </button>
              <button
                onClick={() => setPurchaseTab('subscription')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${purchaseTab === 'subscription' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}
              >
                Monthly Subscription
                <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Save up to 20%</span>
              </button>
            </div>

            {/* 积分包 */}
            {purchaseTab === 'credits' && (
              <div>
                <div className="grid grid-cols-3 gap-3">
                  {PLANS.map(plan => (
                    <div key={plan.id} className={`relative border-2 rounded-xl p-4 flex flex-col transition ${plan.badge === 'Most Popular' ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'}`}>
                      {plan.badge && (
                        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs px-3 py-0.5 rounded-full whitespace-nowrap ${plan.badge === 'Most Popular' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                          {plan.badge}
                        </span>
                      )}
                      <div className="mb-3">
                        <div className="font-bold text-gray-800">{plan.name}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">${plan.price}</div>
                        <div className="text-gray-400 text-xs">{plan.credits} credits · ${plan.unit} each</div>
                      </div>
                      <ul className="space-y-1 mb-4 flex-1">
                        {plan.features.map((f, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <button className={`w-full py-2 rounded-lg text-sm font-semibold transition ${plan.badge === 'Most Popular' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-900 text-white hover:bg-gray-700'}`}>
                        Buy {plan.name}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-4 text-xs text-gray-400">
                  <span>✓ Secure payment</span>
                  <span>✓ No hidden fees</span>
                  <span>✓ 7-day refund guarantee</span>
                  <span>✓ Credits never expire</span>
                </div>
              </div>
            )}

            {/* 月订阅 */}
            {purchaseTab === 'subscription' && (
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {SUBSCRIPTIONS.map(sub => (
                    <div key={sub.id} className={`relative border-2 rounded-xl p-4 flex flex-col transition ${sub.badge === 'Best Value' ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'}`}>
                      {sub.badge && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-3 py-0.5 rounded-full whitespace-nowrap">
                          {sub.badge}
                        </span>
                      )}
                      <div className="mb-3">
                        <div className="font-bold text-gray-800">{sub.name}</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">${sub.price}<span className="text-sm font-normal text-gray-400">/mo</span></div>
                      </div>
                      <ul className="space-y-1 mb-4 flex-1">
                        {sub.features.map((f, i) => (
                          <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <button className="w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition">
                        Subscribe {sub.name}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-4 text-xs text-gray-400">
                  <span>✓ Cancel anytime</span>
                  <span>✓ No hidden fees</span>
                  <span>✓ 7-day refund guarantee</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== 个人中心侧边抽屉 ===== */}
      {showProfileDrawer && user && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/30" onClick={() => setShowProfileDrawer(false)} />
          <div className="bg-white w-80 h-full shadow-xl flex flex-col">
            {/* 头部 */}
            <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full ring-2 ring-white" />
                  <div>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-blue-100 text-xs">{user.email}</div>
                  </div>
                </div>
                <button onClick={() => setShowProfileDrawer(false)} className="text-white/70 hover:text-white text-xl">×</button>
              </div>
            </div>

            {/* 额度展示 */}
            <div className="p-5 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">剩余额度</span>
                <span className={`text-2xl font-bold ${user.credits <= 1 ? 'text-red-500' : 'text-green-600'}`}>
                  {user.credits} 次
                </span>
              </div>
              <button
                onClick={() => { setShowProfileDrawer(false); setShowPurchaseModal(true); }}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
              >
                💳 购买更多额度
              </button>
            </div>

            {/* 账户信息 */}
            <div className="p-5 border-b flex-1">
              <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">账户信息</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>账户类型</span>
                  <span className="font-medium text-gray-800">免费用户</span>
                </div>
                <div className="flex justify-between">
                  <span>登录方式</span>
                  <span className="font-medium text-gray-800">Google</span>
                </div>
              </div>
            </div>

            {/* 退出 */}
            <div className="p-5">
              <button
                onClick={handleLogout}
                className="w-full py-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 text-sm"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
