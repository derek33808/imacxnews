# Netlify DNS 配置指南 - Resend 邮件服务

## 概述

本指南将帮你在 Netlify 上配置 DNS 记录，以支持使用 `newsletter@imacxnews.com` 发送邮件。

## 🔍 检查当前域名状态

### 1. 确认域名托管方式

首先确认你的域名是如何托管的：

**选项 A: 域名托管在 Netlify**
- 域名注册商：任意（阿里云、GoDaddy 等）
- DNS 托管：Netlify
- 配置位置：Netlify 控制台

**选项 B: 域名不在 Netlify 托管**
- 域名注册商：阿里云、GoDaddy 等
- DNS 托管：域名注册商
- 配置位置：域名注册商控制台

## 🚀 方法一：Netlify DNS 托管配置

### 前提条件
你的域名已经在 Netlify 中添加并托管 DNS。

### 步骤 1: 登录 Netlify 控制台

1. 访问 [netlify.com](https://netlify.com)
2. 登录你的账户
3. 选择你的 IMACX News 网站

### 步骤 2: 进入 DNS 管理

1. 在网站面板中，点击 **"Domain settings"**
2. 点击 **"DNS records"** 或 **"DNS"**

### 步骤 3: 添加邮件相关 DNS 记录

#### 🔧 添加 MX 记录

```
Record type: MX
Name: @
Value: feedback-smtp.us-east-1.amazonses.com
Priority: 10
TTL: 3600 (或保持默认)
```

#### 🔧 添加 SPF 记录 (TXT)

```
Record type: TXT
Name: @
Value: "v=spf1 include:amazonses.com ~all"
TTL: 3600 (或保持默认)
```

#### 🔧 添加 DMARC 记录 (TXT)

```
Record type: TXT
Name: _dmarc
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@imacxnews.com"
TTL: 3600 (或保持默认)
```

#### 🔧 添加 DKIM 记录 (从 Resend 获取)

在 Resend 控制台中添加域名后，你会得到类似以下的 DKIM 记录：

```
Record type: TXT
Name: [resend-selector]._domainkey
Value: [resend-provided-long-value]
TTL: 3600 (或保持默认)
```

> **注意**: DKIM 记录的具体值需要从 Resend 控制台获取，每个域名都不同。

### 步骤 4: 验证配置

添加所有记录后：

1. 等待 DNS 传播（通常几分钟到1小时）
2. 在 Resend 控制台验证域名
3. 使用我们的测试脚本验证邮件功能

## 🚀 方法二：域名注册商 DNS 配置

如果你的域名 DNS 不在 Netlify 托管，而是在域名注册商（如阿里云、GoDaddy）：

### 阿里云 DNS 配置

1. 登录 [阿里云控制台](https://dns.console.aliyun.com/)
2. 进入 **"云解析 DNS"**
3. 选择 `imacxnews.com` 域名
4. 添加以下记录：

```
# MX 记录
记录类型: MX
主机记录: @
记录值: feedback-smtp.us-east-1.amazonses.com
优先级: 10

# SPF 记录
记录类型: TXT
主机记录: @
记录值: "v=spf1 include:amazonses.com ~all"

# DMARC 记录
记录类型: TXT
主机记录: _dmarc
记录值: "v=DMARC1; p=quarantine; rua=mailto:dmarc@imacxnews.com"

# DKIM 记录 (从 Resend 获取)
记录类型: TXT
主机记录: [resend-selector]._domainkey
记录值: [resend-provided-value]
```

### GoDaddy DNS 配置

1. 登录 [GoDaddy 账户](https://account.godaddy.com/)
2. 进入 **"我的产品"** > **"DNS"**
3. 选择 `imacxnews.com`
4. 添加相同的 DNS 记录（格式略有不同）

### Cloudflare DNS 配置

1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)
2. 选择 `imacxnews.com` 域名
3. 进入 **"DNS"** 选项卡
4. 添加相同的 DNS 记录

## 🔍 DNS 记录配置详细说明

### MX 记录 (邮件交换记录)
```
作用: 指定邮件服务器
必需: 是
记录: @ → feedback-smtp.us-east-1.amazonses.com (优先级: 10)
```

### SPF 记录 (发送方策略框架)
```
作用: 防止邮件欺骗，提高送达率
必需: 是
记录: @ → "v=spf1 include:amazonses.com ~all"
```

### DKIM 记录 (域名密钥识别邮件)
```
作用: 邮件数字签名验证
必需: 是
记录: [selector]._domainkey → [resend-provided-value]
获取: 从 Resend 控制台获取具体值
```

### DMARC 记录 (基于域的消息认证)
```
作用: 邮件认证策略
推荐: 是
记录: _dmarc → "v=DMARC1; p=quarantine; rua=mailto:dmarc@imacxnews.com"
```

## ⚡ 快速配置检查清单

### Netlify 配置步骤

- [ ] 1. 登录 Netlify 控制台
- [ ] 2. 进入网站的 Domain settings
- [ ] 3. 点击 DNS records 或 DNS 管理
- [ ] 4. 添加 MX 记录
- [ ] 5. 添加 SPF 记录 (TXT)
- [ ] 6. 添加 DMARC 记录 (TXT)
- [ ] 7. 从 Resend 获取并添加 DKIM 记录
- [ ] 8. 等待 DNS 传播
- [ ] 9. 在 Resend 验证域名
- [ ] 10. 测试邮件发送

### Resend 配置步骤

- [ ] 1. 登录 [Resend 控制台](https://resend.com)
- [ ] 2. 进入 Domains 页面
- [ ] 3. 点击 "Add Domain"
- [ ] 4. 输入 `imacxnews.com`
- [ ] 5. 复制提供的 DNS 记录
- [ ] 6. 在 Netlify 中添加 DNS 记录
- [ ] 7. 返回 Resend 点击 "Verify Domain"
- [ ] 8. 等待验证完成

## 🧪 DNS 配置验证

### 使用命令行工具验证

```bash
# 检查 MX 记录
dig MX imacxnews.com

# 检查 SPF 记录
dig TXT imacxnews.com

# 检查 DMARC 记录
dig TXT _dmarc.imacxnews.com

# 检查 DKIM 记录 (替换 selector)
dig TXT [selector]._domainkey.imacxnews.com
```

### 使用在线 DNS 检查工具

1. [MXToolbox](https://mxtoolbox.com/)
2. [DNS Checker](https://dnschecker.org/)
3. [What's My DNS](https://www.whatsmydns.net/)

### 使用我们的邮件测试脚本

```bash
# 测试邮件发送功能
node test-email-service.js your-email@example.com welcome
```

## 🚨 常见问题解决

### 问题 1: DNS 记录不生效

**可能原因:**
- DNS 传播未完成
- 记录格式错误
- TTL 设置过高

**解决方法:**
1. 等待更长时间（最多24小时）
2. 检查记录格式是否正确
3. 降低 TTL 值到 300-3600 秒

### 问题 2: Netlify 无法添加某些记录

**可能原因:**
- 账户权限不足
- 域名未正确配置
- DNS 托管未在 Netlify

**解决方法:**
1. 确认域名已正确添加到 Netlify
2. 检查账户权限
3. 考虑使用域名注册商的 DNS

### 问题 3: DKIM 验证失败

**可能原因:**
- DKIM 记录值错误
- 记录名称格式错误
- DNS 传播未完成

**解决方法:**
1. 重新从 Resend 复制 DKIM 记录
2. 确认记录名称包含 `._domainkey`
3. 等待 DNS 传播完成

### 问题 4: 邮件仍进入垃圾箱

**可能原因:**
- DMARC 策略过严
- 邮件内容触发垃圾邮件过滤器
- 域名声誉不佳

**解决方法:**
1. 调整 DMARC 策略为 `p=none`
2. 优化邮件内容
3. 使用专业邮件测试工具

## 📞 技术支持

如果遇到配置问题：

1. **Netlify 官方文档**: [Custom domains and DNS](https://docs.netlify.com/domains-https/custom-domains/)
2. **Resend 官方文档**: [Domain setup](https://resend.com/docs/dashboard/domains/introduction)
3. **DNS 验证工具**: 使用上述在线工具检查配置
4. **项目测试脚本**: `node test-email-service.js`

---

## 🎯 下一步行动

1. **选择配置方法**：Netlify DNS 或域名注册商 DNS
2. **添加 DNS 记录**：按照上述步骤配置
3. **等待传播**：通常需要几分钟到几小时
4. **验证域名**：在 Resend 控制台验证
5. **测试邮件**：使用我们的测试脚本验证功能

完成这些步骤后，你就可以使用 `newsletter@imacxnews.com` 发送专业的邮件了！ 🎉
