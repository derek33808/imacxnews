# 🚀 Netlify 环境变量同步指南

## 📋 必须同步的环境变量清单

### 🔐 核心安全配置
```bash
# JWT认证 (必需)
JWT_SECRET="7Y6XGUNkO8sAto4d/gBTsQmdc4um666TS7P7zJ1jnEEZ50gocclbXg3BICw2NFgC2wej0nJWXxNQFC3xEe09FQ=="

# 管理员配置 (必需)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="imacx2025"
```

### 🗄️ 数据库配置
```bash
# 数据库连接 (必需)
DATABASE_URL="postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"
```

### ☁️ Supabase 配置 (媒体上传)
```bash
# Supabase 服务 (必需)
SUPABASE_URL="https://ihkdquydhciabhrwffkb.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa2RxdXlkaGNpYWJocndmZmtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NTI5MDksImV4cCI6MjA3MjIyODkwOX0.3saXYqHnoamYu2hOp6zsZ1owddvm5Pf2ZkugmBG6C_w"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imloa2RxdXlkaGNpYWJocndmZmtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY1MjkwOSwiZXhwIjoyMDcyMjI4OTA5fQ.-2jwKBYfRo_Ez1lF57iVu_MsTJSsR4m5nxN5iTCwaBw"
SUPABASE_STORAGE_BUCKET="imacx-media"
```

### 📧 邮件服务配置
```bash
# Resend 邮件服务 (必需)
RESEND_API_KEY="re_a22bHRm3_HzGNaGTt7P1qBezZdAEoSTm6"
RESEND_FROM_EMAIL="newsletter@imacxnews.com"
RESEND_FROM_NAME="IMACX News"
```

### ⏰ 邮件调度配置
```bash
# 邮件发送时间和频率
NEWSLETTER_SEND_TIME="08:00"
NEWSLETTER_TIMEZONE="Asia/Shanghai"
NEWSLETTER_FREQUENCY="daily"
NEWSLETTER_WEEKLY_DAY="monday"
NEWSLETTER_MONTHLY_DATE="1"

# 邮件发送控制
NEWSLETTER_MAX_RECIPIENTS_PER_BATCH="100"
NEWSLETTER_BATCH_DELAY="1000"
NEWSLETTER_RETRY_ATTEMPTS="3"
NEWSLETTER_RETRY_DELAY="5000"

# 邮件内容配置
NEWSLETTER_MIN_ARTICLES="1"
NEWSLETTER_MAX_ARTICLES="10"
NEWSLETTER_INCLUDE_IMAGES="true"
```

### 🔧 系统配置
```bash
# 功能开关
ENABLE_SMART_FALLBACK="true"
ENABLE_DATABASE="true"
ENABLE_VIDEO_NEWS="true"

# 媒体限制
MAX_IMAGE_SIZE="10485760"
MAX_VIDEO_SIZE="52428800"

# API 配置
PUBLIC_API_BASE=""
PUBLIC_SECURE_COOKIES="true"
PUBLIC_DEV_NOAUTH="false"
```

## 🛠️ 如何在 Netlify 中设置环境变量

### 方法1: 通过 Netlify 控制台 (推荐)

1. **登录 Netlify Dashboard**
   - 访问 [app.netlify.com](https://app.netlify.com)
   - 选择你的项目

2. **进入环境变量设置**
   ```
   Site Settings → Environment Variables
   ```

3. **批量添加变量**
   - 点击 "Add variable"
   - 逐个添加上述所有变量
   - Key: 变量名 (如 JWT_SECRET)
   - Value: 变量值 (如 你的JWT密钥)

### 方法2: 使用 Netlify CLI

```bash
# 安装 Netlify CLI (如果还没安装)
npm install -g netlify-cli

# 登录
netlify login

# 链接到你的站点
netlify link

# 批量设置环境变量
netlify env:set JWT_SECRET "7Y6XGUNkO8sAto4d/gBTsQmdc4um666TS7P7zJ1jnEEZ50gocclbXg3BICw2NFgC2wej0nJWXxNQFC3xEe09FQ=="
netlify env:set DATABASE_URL "你的数据库URL"
# ... 继续添加其他变量
```

### 方法3: 通过 netlify.toml 文件 (不推荐存储敏感信息)

```toml
# netlify.toml - 只适用于非敏感配置
[build.environment]
  NEWSLETTER_FREQUENCY = "daily"
  NEWSLETTER_SEND_TIME = "08:00"
  ENABLE_VIDEO_NEWS = "true"
  
# ⚠️ 不要在 netlify.toml 中存储密钥和密码！
```

## 🚨 安全注意事项

### ✅ 安全最佳实践
1. **敏感信息**: 所有密钥、密码、API Token 都通过环境变量设置
2. **分环境管理**: 开发/生产环境使用不同的密钥
3. **定期轮换**: 定期更换 API 密钥和密码
4. **最小权限**: 确保 API 密钥只有必要的权限

### ❌ 安全风险
1. **不要提交到 Git**: `.env` 文件已在 `.gitignore` 中
2. **不要硬编码**: 避免在代码中写入密钥
3. **不要分享**: 不要通过不安全渠道分享环境变量

## 🔄 同步步骤

### 立即需要同步的关键变量
```bash
# 这些变量缺失会导致应用无法正常运行
JWT_SECRET
DATABASE_URL
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
```

### 功能相关变量
```bash
# 这些变量影响具体功能，但不会导致应用崩溃
NEWSLETTER_*
MAX_IMAGE_SIZE
MAX_VIDEO_SIZE
```

## ✅ 验证部署

设置完环境变量后：

1. **触发重新部署**
   ```bash
   netlify deploy --prod
   ```

2. **检查变量是否生效**
   - 访问你的生产站点
   - 检查登录功能是否正常
   - 测试邮件订阅功能
   - 验证媒体上传功能

3. **查看部署日志**
   - 在 Netlify 控制台查看构建日志
   - 确认没有环境变量相关错误

## 🎯 部署检查清单

- [ ] JWT_SECRET 已设置
- [ ] DATABASE_URL 已设置
- [ ] Supabase 配置已设置
- [ ] Resend API 密钥已设置
- [ ] 邮件调度配置已设置
- [ ] 媒体上传限制已设置
- [ ] 功能开关已设置
- [ ] 重新部署完成
- [ ] 生产环境功能测试通过

---

⚠️ **重要提醒**: 设置完环境变量后，必须重新部署才能生效！
