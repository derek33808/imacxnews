# 📧 IMACX News 邮件订阅模块 - 完整设置指南

## 🎉 功能特性

✅ **已实现的核心功能：**
- 用户邮件订阅/取消订阅
- 每日自动发送邮件（GitHub Actions定时任务）
- 美观的HTML邮件模板
- 一键取消订阅链接
- 用户个人资料页面订阅管理
- Header菜单订阅状态显示
- Footer和主页订阅表单
- 需要登录才能订阅（安全性）
- 完整的邮件发送日志记录

---

## 🚀 快速开始

### **1. 安装依赖**

```bash
# 安装邮件发送服务
npm install resend

# 如果需要重新生成Prisma客户端
npx prisma generate
```

### **2. 环境变量配置**

在你的 `.env` 文件中添加：

```env
# Resend邮件服务配置
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="IMACX News <newsletter@imacxnews.com>"

# GitHub Actions定时任务密钥
CRON_SECRET="imacx-newsletter-2024-secret"

# 网站URL（用于邮件中的链接）
WEBSITE_URL="https://imacxnews.com"
```

### **3. 获取 Resend API Key**

1. 访问 [Resend.com](https://resend.com) 注册账号
2. 验证你的域名 `imacxnews.com`
3. 在 Dashboard 中创建 API Key
4. 将 API Key 添加到环境变量中

### **4. 数据库迁移**

```bash
# 应用新的数据库schema
npx prisma db push

# 或者创建迁移文件
npx prisma migrate dev --name add-newsletter-features
```

### **5. GitHub Actions 配置**

1. **在 GitHub 仓库中设置 Secret：**
   - 进入 GitHub 仓库 → `Settings` → `Secrets and variables` → `Actions`
   - 添加 Secret：
     - 名称：`CRON_SECRET`
     - 值：`imacx-newsletter-2024-secret`

2. **定时任务已自动配置：**
   - 文件：`.github/workflows/daily-newsletter.yml`
   - 时间：每天北京时间上午9:00（UTC 01:00）
   - 可手动触发测试

### **6. 部署到 Netlify**

```bash
# 构建和部署
npm run build

# 在 Netlify 控制台的环境变量中添加:
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL="IMACX News <newsletter@imacxnews.com>"
CRON_SECRET=imacx-newsletter-2024-secret
```

---

## 📋 功能详细说明

### **1. 用户订阅流程**

1. **订阅入口：**
   - Header 用户菜单中的"Subscribe to Newsletter"按钮
   - Footer 的邮件订阅表单
   - 主页的邮件订阅区块

2. **订阅要求：**
   - 必须先登录或注册
   - 未登录用户点击订阅会提示先登录

3. **订阅状态：**
   - 已登录用户可在个人资料页面管理订阅
   - Header 菜单显示当前订阅状态

### **2. 邮件发送机制**

1. **发送时间：**
   - 每天上午9:00（北京时间）
   - 由 GitHub Actions 自动触发

2. **发送条件：**
   - 只有当天发布的文章才会发送
   - 没有新文章时不发送邮件
   - 只发送给活跃订阅者

3. **邮件内容：**
   - 美观的HTML模板
   - 文章标题、摘要、封面图
   - 阅读全文链接
   - 一键取消订阅链接

### **3. 取消订阅方式**

1. **邮件中一键取消：**
   - 点击邮件底部的"Unsubscribe"链接
   - 无需登录，直接取消

2. **个人资料页面：**
   - 登录后在个人资料中管理订阅
   - 可以重新订阅

3. **Header菜单：**
   - 已订阅用户可在Header菜单中取消订阅

---

## 🔧 API 接口文档

### **订阅相关接口**

```typescript
// 订阅邮件
POST /api/newsletter/subscribe
Headers: { "Content-Type": "application/json" }
Body: { "source": "header" | "footer" | "homepage" | "profile" }
Response: { "success": boolean, "message": string }

// 获取订阅状态
GET /api/newsletter/subscribe
Response: { "subscribed": boolean, "email": string }

// 取消订阅（登录用户）
POST /api/newsletter/unsubscribe
Response: { "success": boolean, "message": string }

// 通过令牌取消订阅（邮件链接）
GET /api/newsletter/unsubscribe?token={unsubscribeToken}
Response: HTML页面确认取消订阅
```

### **邮件发送接口**

```typescript
// 每日邮件发送（内部调用）
POST /api/newsletter/daily-send
Headers: { "Authorization": "Bearer {CRON_SECRET}" }
Response: {
  "success": boolean,
  "stats": {
    "articlesFound": number,
    "emailsSent": number,
    "emailsFailed": number
  }
}
```

---

## 🧪 测试指南

### **1. 功能测试**

```bash
# 1. 测试用户注册和登录
# 2. 测试订阅功能（Header、Footer、主页）
# 3. 测试个人资料页面的订阅管理
# 4. 测试取消订阅功能
```

### **2. 邮件发送测试**

```bash
# 手动触发GitHub Actions
# 1. 进入GitHub仓库的Actions页面
# 2. 选择"Daily Newsletter Sender"
# 3. 点击"Run workflow"

# 或者直接调用API（需要正确的token）
curl -X POST https://imacxnews.com/api/newsletter/daily-send \
  -H "Authorization: Bearer imacx-newsletter-2024-secret"
```

### **3. 模拟发送测试**

如果还没有配置 Resend API Key，系统会自动进入模拟模式：
- 显示发送日志但不实际发送邮件
- 可以验证发送逻辑是否正确

---

## 📊 数据库表结构

### **NewsSubscription 表**
```sql
id              SERIAL PRIMARY KEY
userId          INTEGER REFERENCES User(id)
email           VARCHAR(255) NOT NULL
isActive        BOOLEAN DEFAULT true
unsubscribeToken VARCHAR(255) UNIQUE
source          VARCHAR(50) DEFAULT 'manual'
createdAt       TIMESTAMP DEFAULT NOW()
updatedAt       TIMESTAMP DEFAULT NOW()
```

### **EmailSendLog 表**
```sql
id              SERIAL PRIMARY KEY
sentAt          TIMESTAMP DEFAULT NOW()
recipientCount  INTEGER NOT NULL
articleIds      INTEGER[]
subject         VARCHAR(255) NOT NULL
status          VARCHAR(50) DEFAULT 'sent'
errorMessage    TEXT
```

---

## 🛠️ 故障排除

### **常见问题**

1. **邮件发送失败**
   ```bash
   # 检查环境变量
   echo $RESEND_API_KEY
   
   # 检查API日志
   # 查看GitHub Actions执行日志
   ```

2. **订阅状态不同步**
   ```bash
   # 检查数据库连接
   npx prisma studio
   
   # 检查用户登录状态
   # 在浏览器开发者工具中检查API调用
   ```

3. **GitHub Actions不执行**
   ```bash
   # 检查Secrets配置
   # 确认仓库有足够权限
   # 检查workflow文件语法
   ```

### **调试命令**

```bash
# 检查数据库连接
npx prisma db pull

# 查看数据库数据
npx prisma studio

# 测试API接口
curl -X GET https://imacxnews.com/api/newsletter/subscribe \
  -H "Cookie: token=your-jwt-token"
```

---

## 🎯 下一步扩展

### **可选增强功能**

1. **管理员面板**
   - 订阅者列表管理
   - 邮件发送历史
   - 邮件模板编辑

2. **高级功能**
   - 按分类订阅
   - 邮件发送频率选择
   - A/B测试邮件模板

3. **分析统计**
   - 邮件打开率
   - 点击率统计
   - 订阅者增长趋势

---

## ✅ 部署检查清单

- [ ] Resend API Key 已配置
- [ ] 域名邮箱已验证
- [ ] GitHub Secrets 已设置
- [ ] 数据库迁移已完成
- [ ] 环境变量已配置
- [ ] 测试邮件发送成功
- [ ] 订阅流程测试通过
- [ ] 取消订阅测试通过

---

## 📞 技术支持

如有问题，请检查：
1. GitHub Actions 执行日志
2. Netlify 部署日志
3. Resend Dashboard 发送状态
4. 浏览器开发者工具 Network 面板

**恭喜！你的邮件订阅系统已经完全准备就绪！** 🎉

现在用户可以：
- ✅ 在多个位置订阅邮件
- ✅ 每天收到美观的新闻邮件
- ✅ 一键取消订阅
- ✅ 在个人资料中管理订阅状态

系统将每天自动检查新文章并发送邮件给所有订阅者！
