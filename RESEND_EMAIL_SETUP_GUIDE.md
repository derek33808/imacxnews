# Resend 邮件服务配置指南

## 概述

你的 IMACX News 项目现在已经完整配置了 Resend 邮件服务！邮件功能包括：

- ✅ 用户注册时自动发送欢迎邮件
- ✅ 密码重置时发送确认邮件  
- ✅ 支持邮箱验证功能
- ✅ 完整的邮件测试 API
- ✅ 美观的 HTML 邮件模板

## 🚀 快速开始

### 1. 配置环境变量

在你的 `.env` 文件中添加以下配置：

```env
# Resend 邮件服务配置
RESEND_API_KEY="your-resend-api-key-here"
RESEND_FROM_EMAIL="newsletter@imacxnews.com"
RESEND_FROM_NAME="IMACX News"
```

### 2. 域名验证步骤

1. **登录 Resend 控制台**
   - 访问 [resend.com](https://resend.com)
   - 注册并登录账户

2. **添加域名**
   - 进入 Domains 页面
   - 点击 "Add Domain"
   - 输入：`imacxnews.com`

3. **配置 DNS 记录**
   
   在你的域名服务商（如 Cloudflare、阿里云等）添加以下 DNS 记录：

   **MX 记录：**
   ```
   Name: @
   Type: MX
   Value: feedback-smtp.us-east-1.amazonses.com
   Priority: 10
   ```

   **SPF 记录（TXT）：**
   ```
   Name: @
   Type: TXT
   Value: "v=spf1 include:amazonses.com ~all"
   ```

   **DKIM 记录（TXT）：**
   ```
   Name: [resend-provided-selector]._domainkey
   Type: TXT
   Value: [resend-provided-value]
   ```
   *(具体值在 Resend 控制台中获取)*

   **DMARC 记录（TXT）：**
   ```
   Name: _dmarc
   Type: TXT
   Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@imacxnews.com"
   ```

4. **验证域名**
   - 添加 DNS 记录后，在 Resend 控制台点击 "Verify Domain"
   - 等待验证完成（通常需要几分钟到几小时）

### 3. 获取 API 密钥

1. 在 Resend 控制台进入 API Keys 页面
2. 点击 "Create API Key"
3. 复制 API 密钥到环境变量中

## 📧 邮件功能说明

### 自动邮件

- **用户注册**：自动发送欢迎邮件
- **密码重置**：自动发送确认邮件

### 邮件模板

项目包含以下邮件模板：

1. **欢迎邮件** - 新用户注册时发送
2. **密码重置确认** - 密码重置成功时发送
3. **邮箱验证** - 验证邮箱地址时发送

所有模板都包含：
- 响应式 HTML 设计
- 纯文本版本
- 品牌化样式
- 安全提醒

## 🧪 测试邮件功能

### 使用测试 API

**获取服务状态：**
```bash
curl -X GET https://yourdomain.com/api/email/test
```

**测试欢迎邮件：**
```bash
curl -X POST https://yourdomain.com/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@example.com",
    "type": "welcome",
    "username": "testuser",
    "displayName": "Test User"
  }'
```

**测试密码重置邮件：**
```bash
curl -X POST https://yourdomain.com/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@example.com",
    "type": "password-reset",
    "username": "testuser"
  }'
```

**测试自定义邮件：**
```bash
curl -X POST https://yourdomain.com/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@example.com",
    "type": "custom",
    "subject": "测试邮件",
    "message": "这是一封测试邮件！"
  }'
```

### 在开发环境测试

1. 启动开发服务器：`npm run dev`
2. 访问测试 API：`http://localhost:3000/api/email/test`
3. 使用上述 curl 命令或 Postman 进行测试

## 🌐 Netlify 部署配置

在 Netlify 控制台的 **Site Settings > Environment Variables** 中添加：

```
RESEND_API_KEY = your-resend-api-key
RESEND_FROM_EMAIL = newsletter@imacxnews.com
RESEND_FROM_NAME = IMACX News
```

## 📂 文件结构

```
src/
├── lib/
│   ├── email.ts              # 邮件服务核心模块
│   └── email-utils.ts        # Newsletter 邮件工具
├── pages/
│   └── api/
│       ├── email/
│       │   └── test.ts       # 邮件测试 API
│       └── auth/
│           ├── register.ts   # 注册 API（包含欢迎邮件）
│           └── reset-password.ts # 密码重置 API（包含确认邮件）
```

## 🔧 高级配置

### 自定义邮件模板

你可以在 `src/lib/email.ts` 中修改 `emailTemplates` 对象来自定义邮件模板。

### 批量发送

使用 `sendBatchEmails()` 函数进行批量邮件发送：

```typescript
import { sendBatchEmails } from '../lib/email';

const emails = [
  { to: 'user1@example.com', subject: 'Hello', html: '<p>Hello User 1</p>' },
  { to: 'user2@example.com', subject: 'Hello', html: '<p>Hello User 2</p>' }
];

const results = await sendBatchEmails(emails);
```

### 错误处理

邮件发送失败不会影响主要功能（如用户注册），错误会被记录到控制台：

- 注册成功但邮件发送失败：用户仍然可以正常使用账户
- 密码重置成功但邮件发送失败：密码仍然被成功重置

## 🛡️ 安全注意事项

1. **API 密钥安全**：不要在代码中硬编码 API 密钥
2. **域名验证**：确保域名已正确验证，未验证的域名无法发送邮件
3. **发送限制**：Resend 有发送频率限制，注意控制发送量
4. **垃圾邮件**：正确配置 SPF、DKIM、DMARC 记录以提高送达率

## 🐛 常见问题

### 1. 邮件发送失败

**检查项：**
- API 密钥是否正确
- 域名是否已验证
- DNS 记录是否正确配置
- 环境变量是否正确设置

**调试方法：**
```bash
# 检查服务状态
curl -X GET http://localhost:3000/api/email/test

# 查看控制台日志
npm run dev
```

### 2. 邮件进入垃圾箱

**解决方法：**
- 确保 SPF、DKIM、DMARC 记录正确配置
- 避免使用垃圾邮件关键词
- 保持良好的发送声誉

### 3. 域名验证失败

**可能原因：**
- DNS 记录配置错误
- DNS 传播未完成（需要等待）
- 域名服务商不支持某些记录类型

**解决方法：**
- 使用 DNS 检查工具验证记录
- 等待 DNS 传播完成（最多24小时）
- 联系域名服务商支持

## 📞 技术支持

如果遇到问题：

1. 查看控制台日志
2. 使用测试 API 检查配置
3. 参考 [Resend 官方文档](https://resend.com/docs)
4. 检查项目的 GitHub Issues

---

🎉 **恭喜！你的邮件服务现在已经完全配置好了！**

现在用户注册时会收到精美的欢迎邮件，密码重置时会收到确认邮件。你可以使用测试 API 来验证一切是否正常工作。
