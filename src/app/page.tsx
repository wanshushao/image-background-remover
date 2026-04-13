'use client';

import { useState, useEffect, useRef } from 'react';

const API_BASE = 'https://image-bg-auth.m15629127687.workers.dev';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    paypal: any;
  }
}

interface User {
  email: string;
  name: string;
  avatar: string;
  credits: number;
  subscription_status?: string;
}

// 价格方案
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
    features: ['Unlimited removes / month', 'Max 50 images / day', 'JPG / PNG / WebP support', 'Commercial use allowed', 'Cancel anytime'],
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
  const [showContactModal, setShowContactModal] = useState(false);
  const [purchaseTab, setPurchaseTab] = useState<'credits' | 'subscription'>('credits');
  const [selectedPlan, setSelectedPlan] = useState<string>('popular');
  const [paypalReady, setPaypalReady] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 检查 OAuth 回调带来的 token
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
        .then(data => { if (data.email) setUser(data); })
        .catch(() => localStorage.removeItem('session_token'));
    }

    // 检查 PayPal SDK 加载
    const checkPaypal = setInterval(() => {
      if (window.paypal) {
        setPaypalReady(true);
        clearInterval(checkPaypal);
      }
    }, 500);
    return () => clearInterval(checkPaypal);
  }, []);

  // PayPal 按钮渲染（仅在购买弹窗且积分页时）
  useEffect(() => {
    if (!paypalReady || !showPurchaseModal || purchaseTab !== 'credits' || !paypalContainerRef.current) return;
    if (!user) return;

    const container = paypalContainerRef.current;
    container.innerHTML = '';

    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;

    window.paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 40 },
      createOrder: async () => {
        const token = localStorage.getItem('session_token');
        const res = await fetch(`${API_BASE}/api/paypal/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ planId: selectedPlan }),
        });
        const data = await res.json();
        return data.orderId;
      },
      onApprove: async (data: { orderID: string }) => {
        const token = localStorage.getItem('session_token');
        const res = await fetch(`${API_BASE}/api/paypal/capture-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orderId: data.orderID }),
        });
        const result = await res.json();
        if (result.success) {
          setUser(prev => prev ? { ...prev, credits: result.credits } : null);
          setPaymentSuccess(true);
          setTimeout(() => { setShowPurchaseModal(false); setPaymentSuccess(false); }, 2000);
        }
      },
      onError: (err: unknown) => { console.error('PayPal error:', err); },
    }).render(container);
  }, [paypalReady, showPurchaseModal, purchaseTab, selectedPlan, user]);

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
      if (selectedFile.size > 10 * 1024 * 1024) { setError('文件大小不能超过 10MB'); return; }
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(''); setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.size > 10 * 1024 * 1024) { setError('文件大小不能超过 10MB'); return; }
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setResult(''); setError('');
    }
  };

  const handleRemoveBackground = async () => {
    if (!file) return;
    if (!user) { setShowLoginModal(true); return; }
    if (user.credits <= 0) { setShowPurchaseModal(true); return; }

    setLoading(true); setError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const token = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/api/remove-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (response.ok) {
        const blob = await response.blob();
        setResult(URL.createObjectURL(blob));
        setUser(prev => prev ? { ...prev, credits: prev.credits - 1 } : null);
      } else {
        const err = await response.json();
        if (err.error === 'No credits') setShowPurchaseModal(true);
        else setError(err.error || '处理失败');
      }
    } catch { setError('网络错误'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* 导航栏 */}
      <nav className="bg-white shadow-sm px-6 py-3 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">✨ BgRemover</h1>
        <div className="flex items-center gap-3">
          {/* 联系客服按钮 */}
          <button
            onClick={() => setShowContactModal(true)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
          >
            💬 联系客服
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPurchaseModal(true)}
                className={`text-sm px-3 py-1 rounded-full font-medium transition ${user.credits <= 1 ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              >
                {user.credits <= 1 ? '⚠️' : '💰'} {user.credits} credits left
              </button>
              <button onClick={() => setShowProfileDrawer(true)}>
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full hover:ring-2 hover:ring-blue-400 transition" />
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
              Sign in with Google
            </button>
          )}
        </div>
      </nav>

      {/* 积分提示条 */}
      {user && user.credits === 1 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex items-center justify-between">
          <span className="text-yellow-700 text-sm">⚠️ Only 1 credit left</span>
          <button onClick={() => setShowPurchaseModal(true)} className="text-sm text-yellow-700 underline hover:text-yellow-900">Top up now →</button>
        </div>
      )}

      {/* 主内容 */}
      <div className="flex-1 flex flex-col items-center p-6">
        <div className="w-full max-w-5xl mb-6 text-center">
          <p className="text-gray-500 text-lg">Upload your image — AI removes the background in seconds</p>
          {!user && (
            <p className="text-blue-500 text-sm mt-1">
              👉 <button onClick={handleLogin} className="underline hover:text-blue-700">Sign in to get 3 free credits</button> — no credit card required
            </p>
          )}
        </div>

        {error && (
          <div className="w-full max-w-5xl mb-4 bg-red-50 border border-red-300 text-red-600 rounded-lg p-4 text-center">{error}</div>
        )}

        {!preview && (
          <div
            className="w-full max-w-2xl bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-300 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="text-6xl mb-4">🖼️</div>
            <p className="text-gray-700 text-xl font-medium mb-2">Click or drag image here</p>
            <p className="text-gray-400">JPG, PNG, WebP — max 10MB</p>
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-input" />
          </div>
        )}

        {preview && (
          <div className="w-full max-w-5xl">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center">
                <h3 className="text-gray-600 font-semibold text-center mb-3">🖼️ Original</h3>
                <div className="bg-gray-50 rounded-xl overflow-hidden w-full aspect-square flex items-center justify-center">
                  <img src={preview} alt="Original" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="mt-4 w-full flex justify-center">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" id="file-input2" />
                  <button onClick={() => document.getElementById('file-input2')?.click()} className="px-8 py-2.5 bg-white text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium shadow-sm">
                    📤 Upload another
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col items-center">
                <h3 className="text-gray-600 font-semibold text-center mb-3">✨ Background Removed</h3>
                <div className="rounded-xl overflow-hidden w-full aspect-square flex items-center justify-center" style={{ background: 'repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 0 0 / 20px 20px' }}>
                  {result ? (
                    <img src={result} alt="Result" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <div className="text-center text-gray-400">
                      {loading ? <div><div className="text-4xl mb-2">⏳</div><p>Processing...</p></div> : <div><div className="text-4xl mb-2">✨</div><p>Click to remove background</p></div>}
                    </div>
                  )}
                </div>
                <div className="mt-4 w-full flex justify-center">
                  <button onClick={handleRemoveBackground} disabled={loading || !!result}
                    className="px-8 py-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:bg-gray-300 transition font-medium shadow-sm">
                    {loading ? '⏳ Processing...' : result ? '✅ Done' : '✨ Remove Background'}
                  </button>
                </div>
              </div>
            </div>

            {result && (
              <div className="mt-6 flex justify-center">
                <a href={result} download="result.png" className="px-12 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium shadow-sm text-lg">
                  ⬇️ Download
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== 登录弹窗 ===== */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-5xl mb-4">👋</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Get 3 Free Credits</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in with Google to start removing backgrounds. No credit card required.</p>
            <button onClick={() => { setShowLoginModal(false); handleLogin(); }}
              className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-medium flex items-center justify-center gap-2">
              <span>🔐</span> Sign in with Google → Get 3 Free Credits
            </button>
            <button onClick={() => setShowLoginModal(false)} className="mt-3 text-sm text-gray-400 hover:text-gray-600">Maybe later</button>
          </div>
        </div>
      )}

      {/* ===== 购买弹窗 ===== */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPurchaseModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            {paymentSuccess ? (
              <div className="text-center py-10 px-6">
                <div className="text-6xl mb-5">✅</div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful!</h2>
                <p className="text-blue-600 text-xl font-semibold mb-1">
                  +{PLANS.find(p => p.id === selectedPlan)?.credits} credits added to your account.
                </p>
                <p className="text-gray-400 text-sm mb-8">
                  New balance: <span className="font-semibold text-gray-700">{user?.credits} credits</span>
                </p>
                <button
                  onClick={() => { setShowPurchaseModal(false); setPaymentSuccess(false); }}
                  className="px-10 py-3 bg-blue-500 text-white rounded-xl text-lg font-semibold hover:bg-blue-600 transition"
                >
                  Start Removing Backgrounds →
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Simple, Transparent Pricing</h2>
                    <p className="text-gray-400 text-xs mt-0.5">Start free → No subscription required → Credits never expire</p>
                  </div>
                  <button onClick={() => setShowPurchaseModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                </div>

                {/* Tab */}
                <div className="flex bg-gray-100 rounded-lg p-1 mb-5 mt-4">
                  <button onClick={() => setPurchaseTab('credits')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition ${purchaseTab === 'credits' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                    Credit Packs
                  </button>
                  <button onClick={() => setPurchaseTab('subscription')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${purchaseTab === 'subscription' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                    Monthly Subscription
                    <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">Save up to 20%</span>
                  </button>
                </div>

                {/* 积分包 */}
                {purchaseTab === 'credits' && (
                  <div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {PLANS.map(plan => (
                        <div key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          className={`relative border-2 rounded-xl p-4 flex flex-col cursor-pointer transition ${selectedPlan === plan.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                        >
                          {plan.badge && (
                            <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs px-3 py-0.5 rounded-full whitespace-nowrap ${plan.badge === 'Most Popular' ? 'bg-blue-500' : 'bg-gray-700'}`}>
                              {plan.badge}
                            </span>
                          )}
                          <div className="mb-2">
                            <div className="font-bold text-gray-800">{plan.name}</div>
                            <div className="text-xl font-bold text-gray-900 mt-1">${plan.price}</div>
                            <div className="text-gray-400 text-xs">{plan.credits} credits · ${plan.unit} each</div>
                          </div>
                          <ul className="space-y-1 flex-1">
                            {plan.features.map((f, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                                <span className="text-green-500 mt-0.5">✓</span> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* PayPal 按钮 */}
                    <div ref={paypalContainerRef} className="min-h-[50px]" />
                    {!paypalReady && (
                      <div className="text-center text-gray-400 text-sm py-3">Loading payment...</div>
                    )}

                    <div className="flex justify-center gap-6 mt-3 text-xs text-gray-400">
                      <span>✓ Secure payment</span>
                      <span>✓ No hidden fees</span>
                      <span>✓ 7-day refund guaranteed</span>
                      <span>✓ Credits never expire</span>
                    </div>
                  </div>
                )}

                {/* 订阅 */}
                {purchaseTab === 'subscription' && (
                  <div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {SUBSCRIPTIONS.map(sub => (
                        <div key={sub.id} className={`relative border-2 rounded-xl p-4 flex flex-col transition ${sub.badge === 'Best Value' ? 'border-blue-500' : 'border-gray-200 hover:border-blue-300'}`}>
                          {sub.badge && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-xs px-3 py-0.5 rounded-full whitespace-nowrap">{sub.badge}</span>
                          )}
                          <div className="mb-2">
                            <div className="font-bold text-gray-800">{sub.name}</div>
                            <div className="text-xl font-bold text-gray-900 mt-1">${sub.price}<span className="text-sm font-normal text-gray-400">/mo</span></div>
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
                    <p className="text-xs text-gray-400 text-center">Subscription billing coming soon · Credit packs available now</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== 联系客服弹窗 ===== */}
      {showContactModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowContactModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">💬 联系客服充值</h2>
              <button onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            
            <p className="text-gray-500 text-sm mb-6">
              扫码添加微信好友或直接付款，付款后联系客服确认即可充值积分。
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-700 mb-2">微信好友</h3>
                <img 
                  src="/wechat-qr.jpg" 
                  alt="微信好友二维码" 
                  className="w-40 h-40 mx-auto rounded-lg border border-gray-200"
                />
                <p className="text-xs text-gray-400 mt-2">扫码添加好友咨询</p>
              </div>
              
              <div className="text-center">
                <h3 className="font-semibold text-gray-700 mb-2">支付宝付款</h3>
                <img 
                  src="/alipay-qr.jpg" 
                  alt="支付宝收款码" 
                  className="w-40 h-40 mx-auto rounded-lg border border-gray-200"
                />
                <p className="text-xs text-gray-400 mt-2">扫码直接付款</p>
              </div>
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                💡 <strong>充值流程：</strong>扫码付款 → 截图发给客服 → 确认后即可到账
              </p>
            </div>

            <button
              onClick={() => setShowContactModal(false)}
              className="mt-4 w-full py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* ===== 个人资料抽屉 ===== */}
      {showProfileDrawer && user && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="flex-1 bg-black/30" onClick={() => setShowProfileDrawer(false)} />
          <div className="bg-white w-80 h-full shadow-xl flex flex-col">
            <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full ring-2 ring-white" />
                  <div>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-blue-100 text-xs">{user.email}</div>
                  </div>
                </div>
                <button onClick={() => setShowProfileDrawer(false)} className="text-white/70 hover:text-white text-2xl">×</button>
              </div>
            </div>

            <div className="p-5 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Credits remaining</span>
                <span className={`text-2xl font-bold ${user.credits <= 1 ? 'text-red-500' : 'text-green-600'}`}>{user.credits}</span>
              </div>
              <button onClick={() => { setShowProfileDrawer(false); setShowPurchaseModal(true); }}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
                🛒 Buy more credits
              </button>
            </div>

            <div className="p-5 border-b flex-1">
              <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Account</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Plan</span>
                  <span className="font-medium text-gray-800">
                    {user.subscription_status === 'active' ? '✔ Subscriber' : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sign in</span>
                  <span className="font-medium text-gray-800">Google</span>
                </div>
              </div>
            </div>

            <div className="p-5">
              <button onClick={handleLogout} className="w-full py-2 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 text-sm">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
