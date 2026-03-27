# 部署指南

## 1. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create image-bg-remover-db

# 记录输出的 database_id，例如：
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# 初始化表结构
wrangler d1 execute image-bg-remover-db --file=./schema.sql
```

## 2. 部署 API Worker

```bash
# 创建 wrangler.toml
cat > wrangler-api.toml << 'EOF'
name = "image-bg-api"
main = "api-worker.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "image-bg-remover-db"
database_id = "你的database_id"

[vars]
REMOVE_BG_API_KEY = "rBGxfdAQrf4tUny7zx7DR1Qc"
EOF

# 部署
wrangler deploy --config wrangler-api.toml
```

部署后会得到 Worker URL，例如：
`https://image-bg-api.你的账号.workers.dev`

## 3. 更新前端配置

修改 `index.html` 第 149 行：
```javascript
var API_BASE = 'https://image-bg-api.你的账号.workers.dev';
```

## 4. 推送到 GitHub 并部署

```bash
git add .
git commit -m "feat: add Google login and backend"
git push origin main
```

Cloudflare Pages 会自动部署。

## 5. 测试

1. 访问网站
2. 点击 Google 登录
3. 上传图片测试背景去除
4. 检查额度扣除是否正常
