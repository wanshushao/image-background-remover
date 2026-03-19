# Image Background Remover — MVP 需求文档

> 版本：v0.2 | 日期：2026-03-19 | 状态：草稿

## 一、产品定位

一句话描述：免费在线图片去背景工具，上传即用，无需注册，秒出结果。

目标用户：
- 电商卖家（需要商品白底图）
- 普通用户（证件照换底色、头像处理）
- 设计师（快速抠图）

核心价值：快、免费、无水印（MVP阶段）

## 二、MVP 功能范围

必须有（Must Have）：
- 图片上传：支持拖拽 / 点击上传，格式：JPG、PNG、WEBP，大小限制 5MB
- 背景去除：调用 HuggingFace REMBG API，返回透明背景 PNG
- 结果预览：处理完成后展示对比图（原图 vs 去背景图）
- 下载结果：一键下载 PNG 文件
- 处理状态：Loading 动画，错误提示

不做（Out of Scope for MVP）：
- 用户注册 / 登录
- 图片存储
- 批量处理
- 背景替换
- 付费功能
- API 接口

## 三、技术架构

- 前端：Next.js 14 (App Router) + Tailwind CSS
- 部署：Cloudflare Pages + Cloudflare Workers
- AI处理：HuggingFace Space - REMBG API（免费）
- 存储：不需要（内存处理，不落盘）
- 数据库：不需要

部署说明：
- 前端静态资源：Cloudflare Pages（全球 CDN，免费无限请求，500次构建/月）
- API 层：Cloudflare Workers（转发 HuggingFace 请求，免费 10万次/天）
- Next.js 需使用 @cloudflare/next-on-pages 适配，API Routes 使用 Edge Runtime

数据流：
1. 用户上传图片
2. 前端压缩（超过 2MB 自动压缩）
3. POST /api/remove-bg（Cloudflare Worker）
4. 转发至 HuggingFace Space API
5. 返回透明背景 PNG（base64）
6. 前端展示 + 提供下载

## 四、页面结构

主页（/）：

Header
- Logo + 产品名
- 导航（暂时只有首页）

Hero Section
- 标题：Remove Image Background Free & Instantly
- 副标题：No signup required. 100% free.
- 上传区域（拖拽 / 点击）

Result Section（上传后显示）
- 左：原图
- 右：去背景结果图（棋盘格背景表示透明）
- 下载按钮

How It Works（3步说明）
1. Upload your image
2. AI removes the background
3. Download your PNG

Footer
- 版权信息
- 后续加：Privacy Policy / Terms

## 五、API 设计

POST /api/remove-bg（Cloudflare Worker）

Request：
```json
{ "image": "data:image/jpeg;base64,..." }
```

Response 成功：
```json
{ "result": "data:image/png;base64,..." }
```

Response 失败：
```json
{ "error": "Processing failed. Please try again." }
```

限制：
- 文件大小：最大 5MB（前端校验）
- 超时：30s（HF Space 冷启动可能慢）
- Worker 单次请求体限制：100MB（足够）
- 频率限制：暂不做（MVP阶段）

## 六、SEO 基础配置

- Title：Free Image Background Remover Online - Remove BG Instantly
- Description：Remove image background for free in seconds. No signup required. Upload JPG, PNG or WEBP and download transparent PNG instantly.
- OG Image：产品截图（1200x630）
- Sitemap：/sitemap.xml 自动生成
- Schema：WebApplication markup

## 七、非功能需求

- 首屏加载：< 2s（Cloudflare CDN 全球加速）
- 处理时间：< 10s（正常情况），冷启动 < 30s
- 移动端适配：响应式，支持手机上传
- 浏览器支持：Chrome / Safari / Firefox 最新版

## 八、MVP 开发计划

- Week 1：搭 Next.js 项目 + 配置 @cloudflare/next-on-pages，完成上传 UI（3-4天）
- Week 2：接 HuggingFace API，Cloudflare Worker 跑通核心流程（2-3天）
- Week 3：结果展示、下载、错误处理、移动端适配（3-4天）
- Week 4：SEO 基础配置、部署 Cloudflare Pages、上线（2天）

## 九、成功指标（上线后1个月）

- Google Search Console 收录页面数 > 5
- 日均 UV > 50
- 工具使用成功率 > 90%
- 核心 Web Vitals 全绿

## 十、后续迭代方向（Post-MVP）

1. 背景替换（换颜色 / 换图片）
2. 证件照场景（换底色 + 规格裁剪）
3. 批量处理
4. Freemium 付费墙（高分辨率下载）
5. 多语言（中文版）
6. API 对外开放
