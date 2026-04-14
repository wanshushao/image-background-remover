"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
export default function SuccessPage() {
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  useEffect(() => {
    fetch("https://image-bg-auth.m15629127687.workers.dev/api/user", {
      headers: { Authorization: `Bearer ${localStorage.getItem("session_token")}` }
    })
      .then(res => res.json())
      .then(data => setCredits(data.credits));
  }, []);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-lg">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-green-600 mb-4">购买成功！</h1>
        {credits !== null && (
          <p className="text-xl text-gray-700 mb-6">
            您的账户现在有 <span className="font-bold text-green-600">{credits}</span> 积分
          </p>
        )}
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          返回首页
        </button>
      </div>
    </div>
  );
}
