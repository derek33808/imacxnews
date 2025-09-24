# 用户注册通知和密码找回功能完整指南

## 🎉 功能概览

本系统提供了完整的用户注册通知和安全的密码找回功能，使用 `service@imacxnews.com` 作为发送邮箱。

### ✨ 主要特性

- 🔐 **安全的密码重置系统**：基于令牌的密码重置机制
- 📧 **专业邮件服务**：使用 `service@imacxnews.com` 发送通知邮件
- 🛡️ **安全防护**：防止邮箱枚举攻击，令牌自动过期
- 🎨 **美观界面**：现代化的用户界面设计
- 📱 **响应式设计**：支持各种设备屏幕尺寸

## 🚀 快速开始

### 1. 数据库迁移

首先需要应用数据库迁移来添加密码重置令牌表：

```bash
# 生成数据库迁移
npx prisma migrate dev --name add_password_reset_tokens

# 或直接推送schema更改
npx prisma db push
```

### 2. 环境变量配置

确保在 `.env` 文件中配置了正确的邮件服务：

```env
# Resend 邮件服务配置
RESEND_API_KEY="your-resend-api-key-here"
RESEND_FROM_EMAIL="service@imacxnews.com"
RESEND_FROM_NAME="IMACX News"
```

### 3. 域名验证

在 Resend 控制台中验证 `imacxnews.com` 域名，确保 `service@imacxnews.com` 邮箱可以正常发送邮件。

## 📋 功能详解

### 用户注册通知

当用户成功注册时，系统会自动：

1. ✅ 创建用户账户
2. 📧 发送欢迎邮件到用户邮箱
3. 🔑 自动登录用户

**API端点：** `POST /api/auth/register`

### 密码找回流程

完整的密码找回流程包括：

#### 1. 请求密码重置

**页面：** `/auth/forgot-password`
**API：** `POST /api/auth/forgot-password`

用户输入邮箱地址，系统会：
- 🔍 查找用户账户
- 🔑 生成安全令牌（SHA-256哈希）
- 📧 发送重置邮件
- ⏰ 令牌1小时后自动过期

#### 2. 密码重置验证

**页面：** `/auth/reset-password`
**API：** `POST /api/auth/verify-reset-password`

用户点击邮件中的链接后：
- 🛡️ 验证令牌有效性和过期时间
- 🔒 允许用户设置新密码
- ✅ 更新密码并标记令牌为已使用
- 📧 发送重置确认邮件

#### 3. 令牌验证API

**API：** `GET /api/auth/verify-reset-password?token=xxx`

用于前端页面验证令牌是否有效，不执行密码重置操作。

## 🛡️ 安全特性

### 1. 令牌安全
- 🔐 **强随机性**：使用32字节随机数生成令牌
- 🏗️ **哈希存储**：数据库中存储SHA-256哈希，不存储原始令牌
- ⏰ **自动过期**：令牌1小时后自动失效
- 🔄 **一次性使用**：令牌使用后立即标记为已使用

### 2. 防护措施
- 🚫 **防止枚举攻击**：无论邮箱是否存在都返回成功消息
- 🧹 **自动清理**：定期清理过期和已使用的令牌
- 📝 **详细日志**：记录所有重置操作用于审计

### 3. 用户体验安全
- 🔔 **实时验证**：前端实时验证密码匹配和强度
- 📧 **确认邮件**：密码重置成功后发送确认邮件
- 🔙 **友好提示**：清晰的错误信息和操作指导

## 📁 文件结构

```
src/
├── lib/
│   ├── email.ts                     # 邮件服务核心模块
│   └── password-reset.ts            # 🆕 密码重置工具库
├── pages/
│   ├── api/
│   │   └── auth/
│   │       ├── register.ts          # 用户注册API
│   │       ├── forgot-password.ts   # 🆕 密码重置请求API
│   │       └── verify-reset-password.ts  # 🆕 密码重置验证API
│   └── auth/
│       ├── forgot-password.astro    # 🆕 忘记密码页面
│       └── reset-password.astro     # 🆕 重置密码页面
└── prisma/
    └── schema.prisma                # 🆕 添加了PasswordResetToken模型
```

## 🎨 邮件模板

### 1. 密码重置请求邮件

**发送时机**：用户请求密码重置时
**包含内容**：
- 安全的重置链接
- 1小时过期提醒
- 安全建议
- 客服联系方式

### 2. 密码重置确认邮件

**发送时机**：密码重置成功后
**包含内容**：
- 重置成功确认
- 安全提醒
- 登录链接

### 3. 用户注册欢迎邮件

**发送时机**：用户注册成功时
**包含内容**：
- 个性化欢迎信息
- 网站功能介绍
- 使用指南

## 🔧 API 使用示例

### 请求密码重置

```javascript
const response = await fetch('/api/auth/forgot-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

const data = await response.json();
// { success: true, message: "If this email is registered..." }
```

### 验证令牌

```javascript
const response = await fetch(`/api/auth/verify-reset-password?token=${token}`);
const data = await response.json();
// { valid: true, user: { username: "...", email: "..." } }
```

### 重置密码

```javascript
const response = await fetch('/api/auth/verify-reset-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: 'reset-token-here',
    newPassword: 'new-secure-password'
  })
});

const data = await response.json();
// { success: true, message: "Password reset successfully", user: {...} }
```

## 🔄 维护任务

### 1. 定期清理

建议设置定时任务清理过期令牌：

```javascript
// 在服务器启动时或定时任务中调用
import { cleanupExpiredTokens } from '../lib/password-reset';

// 清理过期令牌
const cleanedCount = await cleanupExpiredTokens();
console.log(`Cleaned up ${cleanedCount} expired tokens`);
```

### 2. 监控和日志

- 📊 监控密码重置请求频率
- 🔍 跟踪邮件发送成功率
- 🚨 监控异常重置行为

### 3. 安全审计

- 📋 定期检查重置日志
- 🔒 验证令牌生成安全性
- 📧 确认邮件发送状态

## 🐛 故障排除

### 1. 邮件发送失败

**检查项：**
- ✅ RESEND_API_KEY 是否正确配置
- ✅ service@imacxnews.com 域名是否验证
- ✅ DNS 记录是否正确配置

### 2. 令牌验证失败

**可能原因：**
- ⏰ 令牌已过期（1小时）
- 🔄 令牌已被使用
- 🔑 令牌格式不正确

### 3. 数据库错误

**解决方案：**
```bash
# 同步数据库schema
npx prisma db push

# 检查数据库连接
npm run test-db-connection
```

## 📞 技术支持

如果遇到问题：

1. 📝 查看控制台日志
2. 🔧 使用邮件测试API检查配置
3. 📚 参考 [Resend 官方文档](https://resend.com/docs)
4. 📧 联系技术支持：service@imacxnews.com

---

## 🎉 总结

现在您的 IMACX News 系统拥有了完整的用户认证和密码管理功能：

- ✅ **安全的密码重置**：基于令牌的验证机制
- ✅ **专业邮件服务**：使用 service@imacxnews.com 发送
- ✅ **用户友好界面**：现代化的重置页面
- ✅ **完整的安全防护**：防止各种攻击向量
- ✅ **自动化维护**：令牌自动清理和过期

用户现在可以安全、便捷地管理他们的账户密码！🚀

