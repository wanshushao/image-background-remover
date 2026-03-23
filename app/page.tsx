"use client";

import { useEffect, useRef } from "react";

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultDivRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fileInput = fileInputRef.current;
    if (!fileInput) return;

    const handleChange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      const resultDiv = resultDivRef.current;
      if (!resultDiv) return;

      resultDiv.innerHTML = '<div class="text-center py-4 text-gray-600">正在处理图片...</div>';

      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];

          const response = await fetch('/api/remove-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64 })
          });

          if (!response.ok) {
            const error = await response.json();
            resultDiv.innerHTML = `<div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">${error.error || '处理失败'}</div>`;
            return;
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          resultDiv.innerHTML = `
            <div class="mt-6">
              <p class="mb-4 font-medium text-gray-700 text-center">去背景结果预览：</p>
              <img src="${url}" alt="去背景效果" class="w-full rounded-lg border-2 border-gray-200">
              <a href="${url}" download="no-background.png" class="mt-4 block w-full px-6 py-3 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition-colors">
                下载图片
              </a>
            </div>
          `;
        };

        reader.onerror = () => {
          resultDiv.innerHTML = '<div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">文件读取失败</div>';
        };

        reader.readAsDataURL(file);
      } catch (err: any) {
        resultDiv.innerHTML = `<div class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">${err.message}</div>`;
      }
    };

    fileInput.addEventListener('change', handleChange);
    return () => fileInput.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
          图像背景一键去除
        </h1>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="block w-full px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
          >
            选择图片上传
          </button>

          <div ref={resultDivRef}></div>
        </div>
      </div>
    </div>
  );
}
