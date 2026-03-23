"use client";

export default function Home() {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("请上传图片文件");
      return;
    }

    // 显示加载状态
    const resultDiv = document.getElementById('result');
    if (resultDiv) {
      resultDiv.innerHTML = '<div class="text-center py-4">正在处理图片...</div>';
    }

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];

        const res = await fetch("/api/remove-background", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64 }),
        });

        if (!res.ok) {
          const json = await res.json();
          if (resultDiv) {
            resultDiv.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">${json.error || "去背景失败"}</div>`;
          }
          return;
        }

        const blob = await res.blob();
        
        if (blob.size === 0) {
          if (resultDiv) {
            resultDiv.innerHTML = '<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">API返回空数据，可能是余额不足</div>';
          }
          return;
        }
        
        const url = URL.createObjectURL(blob);
        
        // 直接显示结果
        if (resultDiv) {
          resultDiv.innerHTML = `
            <div class="mt-6">
              <p class="mb-4 font-medium text-gray-700 text-center">去背景结果预览：</p>
              <img src="${url}" alt="去背景效果" class="w-full rounded-lg border-2 border-gray-200" />
              <a href="${url}" download="no-background.png" class="mt-4 block w-full px-6 py-3 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition-colors">
                下载图片
              </a>
            </div>
          `;
        }
      };
      
      reader.onerror = () => {
        if (resultDiv) {
          resultDiv.innerHTML = '<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">文件读取失败</div>';
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      const resultDiv = document.getElementById('result');
      if (resultDiv) {
        resultDiv.innerHTML = `<div class="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">${err.message || "请求失败"}</div>`;
      }
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
          图像背景一键去除
        </h1>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <label className="block w-full px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
            选择图片上传
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <div id="result"></div>
        </div>
      </div>
    </div>
  );
}
