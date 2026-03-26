'use client'

import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement
    if (!fileInput) return

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (!file) return

      if (file.size > 5 * 1024 * 1024) {
        const resultDiv = document.getElementById('result')
        if (resultDiv) resultDiv.innerHTML = '<div class="error">❌ 图片大小不能超过 5MB</div>'
        return
      }

      const resultDiv = document.getElementById('result')
      if (!resultDiv) return

      resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><div class="loading-text">正在处理图片...</div></div>'

      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        fetch('https://green-glade-44b7.m15629127687.workers.dev', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64 })
        })
          .then(response => {
            if (!response.ok) {
              return response.json().then((error: any) => {
                throw new Error(error.error || '处理失败')
              })
            }
            return response.blob()
          })
          .then(blob => {
            const url = URL.createObjectURL(blob)
            resultDiv.innerHTML = `<div class="result-title">✅ 处理完成</div><img src="${url}"><a href="${url}" download="no-background.png" class="download-btn">⬇️ 下载图片</a>`
          })
          .catch((err: Error) => {
            resultDiv.innerHTML = `<div class="error">❌ ${err.message}</div>`
          })
      }
      reader.onerror = () => {
        resultDiv.innerHTML = '<div class="error">❌ 文件读取失败</div>'
      }
      reader.readAsDataURL(file)
    }

    fileInput.addEventListener('change', handleChange)
    return () => fileInput.removeEventListener('change', handleChange)
  }, [])

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 100%;
        }
        h1 { text-align: center; color: #1f2937; font-size: 32px; margin-bottom: 10px; font-weight: 700; }
        .subtitle { text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 30px; }
        .upload-area {
            border: 3px dashed #d1d5db; border-radius: 12px; padding: 40px 20px;
            text-align: center; cursor: pointer; transition: all 0.3s ease; background: #f9fafb;
        }
        .upload-area:hover { border-color: #667eea; background: #f3f4f6; }
        .upload-icon { font-size: 48px; margin-bottom: 15px; }
        .upload-text { color: #374151; font-size: 16px; font-weight: 500; margin-bottom: 8px; }
        .upload-hint { color: #9ca3af; font-size: 14px; }
        #result { margin-top: 30px; }
        #result img { width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .result-title { text-align: center; color: #374151; font-size: 18px; font-weight: 600; margin-bottom: 15px; }
        .download-btn {
            display: block; width: 100%; padding: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; border: none; border-radius: 12px; cursor: pointer;
            font-size: 16px; font-weight: 600; text-decoration: none; text-align: center;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .loading { text-align: center; padding: 40px 20px; }
        .spinner {
            border: 4px solid #f3f4f6; border-top: 4px solid #667eea; border-radius: 50%;
            width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .loading-text { color: #6b7280; font-size: 16px; }
        .error { padding: 20px; background: #fee2e2; border: 2px solid #fca5a5; border-radius: 12px; color: #dc2626; text-align: center; }
        .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 13px; }
      `}</style>
      <div className="container">
        <h1>✨ 图像背景去除</h1>
        <p className="subtitle">一键去除图片背景，快速简单</p>
        <input type="file" id="fileInput" accept="image/*" style={{display: 'none'}} />
        <div className="upload-area" onClick={() => { const el = document.getElementById('fileInput'); if(el) el.click(); }}>
          <div className="upload-icon">📸</div>
          <div className="upload-text">点击上传图片</div>
          <div className="upload-hint">支持 JPG、PNG 格式，最大 5MB</div>
        </div>
        <div id="result"></div>
        <div className="footer">Powered by Remove.bg API</div>
      </div>
    </>
  )
}
// force rebuild
