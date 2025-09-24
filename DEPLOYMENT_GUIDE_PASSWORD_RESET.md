# 密码重置功能部署指南

## 🚀 部署步骤

### 1. 数据库迁移

执行以下SQL脚本创建密码重置令牌表：

```bash
# 方法1: 使用Prisma（推荐）
npx prisma db push

# 方法2: 手动执行SQL文件
psql -h your-host -U your-username -d your-database -f add-password-reset-tokens.sql
```

### 2. 环境变量配置

确保在生产环境中配置以下环境变量：

```env
# 更新邮件发送者为service@imacxnews.com
RESEND_FROM_EMAIL="service@imacxnews.com"
RESEND_FROM_NAME="IMACX News"
RESEND_API_KEY="your-resend-api-key"

# 确保其他必需的环境变量
DATABASE_URL="your-database-url"
JWT_SECRET="your-jwt-secret"
```

### 3. 域名和邮件服务配置

在 Resend 控制台中：

1. **添加 service@imacxnews.com**
2. **验证域名配置**
3. **测试邮件发送功能**

### 4. 文件部署清单

确保以下新文件已部署到生产环境：

```
✅ src/lib/password-reset.ts
✅ src/pages/api/auth/forgot-password.ts  
✅ src/pages/api/auth/verify-reset-password.ts
✅ src/pages/auth/forgot-password.astro
✅ src/pages/auth/reset-password.astro
✅ prisma/schema.prisma (已更新)
✅ src/lib/email.ts (已更新)
```

## 🧪 测试指南

### 1. API测试

**测试密码重置请求：**
```bash
curl -X POST https://yourdomain.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**预期响应：**
```json
{
  "success": true,
  "message": "If this email is registered, you will receive a password reset link shortly."
}
```

### 2. 页面测试

1. **访问忘记密码页面：** `https://yourdomain.com/auth/forgot-password`
2. **输入有效邮箱地址**
3. **检查邮箱是否收到重置邮件**
4. **点击邮件中的重置链接**
5. **测试密码重置页面功能**

### 3. 邮件测试

使用现有的邮件测试API：

```bash
curl -X POST https://yourdomain.com/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "type": "custom",
    "subject": "邮件服务测试",
    "message": "来自service@imacxnews.com的测试邮件"
  }'
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 邮件发送失败
```
错误：邮件发送失败
解决：检查RESEND_API_KEY和域名验证状态
```

#### 2. 数据库连接错误
```
错误：Can't reach database server
解决：检查DATABASE_URL配置和数据库连接
```

#### 3. 令牌验证失败
```
错误：Invalid or expired reset token
解决：检查令牌是否过期（1小时）或已使用
```

### 调试命令

```bash
# 检查Prisma连接
npx prisma studio

# 查看数据库表
npx prisma db seed

# 测试邮件配置
curl -X GET https://yourdomain.com/api/email/test
```

## 📊 监控建议

### 1. 关键指标监控

- 📧 邮件发送成功率
- 🔑 令牌生成和验证频率
- ⏰ 令牌过期和清理统计
- 🚫 失败的重置尝试次数

### 2. 日志监控

关注以下日志消息：
```
🔑 Password reset token created for user X
🔄 Password reset successful for user Y
❌ Invalid password reset token attempt
🧹 Cleaned up X expired tokens
```

### 3. 安全监控

- 监控短时间内大量重置请求
- 检查可疑的令牌验证模式
- 跟踪重置邮件发送频率

## 🛡️ 安全检查清单

- ✅ 令牌采用安全随机生成
- ✅ 数据库中存储哈希值而非原始令牌
- ✅ 令牌有过期机制（1小时）
- ✅ 防止邮箱枚举攻击
- ✅ 自动清理过期令牌
- ✅ 详细的安全日志记录

## 📋 上线后验证

### 1. 功能验证
- [ ] 用户注册邮件正常发送
- [ ] 密码重置流程完整可用
- [ ] 邮件模板显示正常
- [ ] 所有页面响应式设计工作正常

### 2. 性能验证
- [ ] API响应时间合理（< 2秒）
- [ ] 邮件发送不阻塞用户操作
- [ ] 数据库查询性能良好

### 3. 安全验证
- [ ] 令牌无法被猜测或暴力破解
- [ ] 过期令牌无法使用
- [ ] 已使用令牌无法重复使用

## 🔄 维护任务

### 每日任务
- 检查邮件发送状态
- 监控系统错误日志

### 每周任务
- 分析用户重置密码使用情况
- 清理数据库中的过期令牌记录

### 每月任务
- 审查密码重置安全日志
- 评估系统性能和优化需求

---

## ✅ 部署完成确认

完成部署后，请确认：

1. ✅ 数据库迁移成功执行
2. ✅ 环境变量正确配置
3. ✅ service@imacxnews.com 邮箱验证通过
4. ✅ 所有API端点正常响应
5. ✅ 前端页面功能正常
6. ✅ 邮件发送测试成功
7. ✅ 完整的密码重置流程测试通过

🎉 恭喜！您的密码重置功能已成功部署！

