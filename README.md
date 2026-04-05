# 🖼️ Image Background Remover — Free AI-Powered Background Removal Tool

**Remove image backgrounds instantly with AI** — no design skills needed, no software to install.

👉 **Live Demo:** [https://www.image-background-remover.shop](https://www.image-background-remover.shop)

---

## ✨ Features

- **One-click background removal** — upload your image and get a clean PNG in seconds
- **AI-powered precision** — automatically detects subjects: people, products, animals, and more
- **Free to use** — no account required for basic usage
- **Privacy-first** — images are processed and not stored permanently
- **Fast & lightweight** — built on Cloudflare's global edge network

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [Next.js](https://nextjs.org) + TypeScript |
| Styling | Tailwind CSS |
| Deployment | Cloudflare Pages |
| Auth | Google OAuth via Cloudflare Workers |
| Database | Cloudflare D1 (SQLite at the edge) |
| Payments | PayPal |

---

## 🚀 Use Cases

- **E-commerce sellers** — remove product photo backgrounds for clean white backgrounds
- **Social media creators** — create transparent PNGs for thumbnails and stories
- **Designers** — quick background removal without Photoshop
- **Developers** — integrate via API (coming soon)

---

## 🏁 Getting Started (Local Development)

```bash
# Clone the repo
git clone https://github.com/wanshushao/image-background-remover.git
cd image-background-remover

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📦 Deployment

This project is deployed on **Cloudflare Pages** with **Cloudflare Workers** for the backend auth/payment layer.

```bash
# Build static export
npm run build

# Deploy to Cloudflare Pages
CLOUDFLARE_API_TOKEN=your_token wrangler pages deploy out --project-name=image-background-remover
```

---

## 🔑 Environment Variables (Cloudflare Workers)

Set these in your Cloudflare Worker's environment settings:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `PAYPAL_CLIENT_ID` | PayPal API Client ID |
| `PAYPAL_CLIENT_SECRET` | PayPal API Client Secret |

---

## 📄 License

MIT License — free to use and modify.

---

## 🌐 Related Tools

Looking for more image tools?
- [Remove.bg](https://www.remove.bg) — popular background remover
- [Canva Background Remover](https://www.canva.com) — design platform with BG removal
- **[Image Background Remover](https://www.image-background-remover.shop)** — our free, fast alternative ✨

---

*Built with ❤️ using Next.js and Cloudflare*
