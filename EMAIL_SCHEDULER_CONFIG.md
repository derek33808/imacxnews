# 📧 邮件发送频率和时间配置指南

本文档介绍如何配置 IMACX News 的邮件发送调度系统。

## 🕐 发送时间和频率配置

### 基础发送配置

```bash
# 每日发送时间（24小时格式）
NEWSLETTER_SEND_TIME="08:00"          # 上午8点发送

# 时区设置
NEWSLETTER_TIMEZONE="Asia/Shanghai"    # 中国时区

# 发送频率
NEWSLETTER_FREQUENCY="daily"           # 选项: daily, weekly, monthly, disabled
```

### 发送频率选项

#### 1. 每日发送 (daily)
```bash
NEWSLETTER_FREQUENCY="daily"
# 每天在指定时间发送（如果有新文章）
```

#### 2. 每周发送 (weekly)
```bash
NEWSLETTER_FREQUENCY="weekly"
NEWSLETTER_WEEKLY_DAY="monday"         # 每周一发送
# 可选值: monday, tuesday, wednesday, thursday, friday, saturday, sunday
```

#### 3. 每月发送 (monthly)
```bash
NEWSLETTER_FREQUENCY="monthly"
NEWSLETTER_MONTHLY_DATE="1"            # 每月1号发送
# 值范围: 1-28 (避免月份天数差异问题)
```

#### 4. 禁用发送 (disabled)
```bash
NEWSLETTER_FREQUENCY="disabled"        # 完全禁用邮件发送
```

## 🔄 批量发送和重试配置

### 发送速率限制
```bash
# 每批次最大收件人数量
NEWSLETTER_MAX_RECIPIENTS_PER_BATCH="100"    # Resend API 建议不超过100

# 批次间延迟时间（毫秒）
NEWSLETTER_BATCH_DELAY="1000"               # 批次间等待1秒

# 失败重试次数
NEWSLETTER_RETRY_ATTEMPTS="3"               # 发送失败时重试3次

# 重试延迟时间（毫秒）
NEWSLETTER_RETRY_DELAY="5000"               # 重试前等待5秒
```

### 配置建议

| 订阅者数量 | 批次大小 | 批次延迟 | 预计发送时间 |
|-----------|----------|----------|-------------|
| < 100     | 50       | 500ms    | < 1分钟     |
| 100-1000  | 100      | 1000ms   | 5-10分钟    |
| > 1000    | 100      | 2000ms   | 20-30分钟   |

## 📝 内容配置

```bash
# 最少文章数量才发送
NEWSLETTER_MIN_ARTICLES="1"                  # 至少有1篇文章才发送

# 单次邮件最多文章数量
NEWSLETTER_MAX_ARTICLES="10"                 # 每封邮件最多包含10篇文章

# 是否在邮件中包含图片
NEWSLETTER_INCLUDE_IMAGES="true"             # 包含文章封面图片
```

## 🔐 安全配置

```bash
# Cron任务认证密钥
CRON_SECRET="your-secure-cron-secret-key"    # 用于保护API端点
```

## 🚀 使用示例

### 示例1: 工作日每日发送
```bash
NEWSLETTER_FREQUENCY="daily"
NEWSLETTER_SEND_TIME="09:00"
NEWSLETTER_TIMEZONE="Asia/Shanghai"
NEWSLETTER_MIN_ARTICLES="2"
NEWSLETTER_MAX_ARTICLES="8"
```

### 示例2: 每周汇总
```bash
NEWSLETTER_FREQUENCY="weekly"
NEWSLETTER_WEEKLY_DAY="friday"
NEWSLETTER_SEND_TIME="17:00"
NEWSLETTER_MIN_ARTICLES="5"
NEWSLETTER_MAX_ARTICLES="15"
```

### 示例3: 月度精选
```bash
NEWSLETTER_FREQUENCY="monthly"
NEWSLETTER_MONTHLY_DATE="15"
NEWSLETTER_SEND_TIME="10:00"
NEWSLETTER_MIN_ARTICLES="10"
NEWSLETTER_MAX_ARTICLES="20"
```

## 📊 监控和调试

### 查看调度状态
访问 `/api/newsletter/status` 可以查看当前调度配置和状态。

### 手动触发发送
发送 POST 请求到 `/api/newsletter/daily-send` 并包含认证头：
```bash
curl -X POST "https://yourdomain.com/api/newsletter/daily-send" \
  -H "Authorization: Bearer your-cron-secret-key"
```

### 日志监控
系统会输出详细的发送日志：
- ⚙️ 配置信息
- 📧 发送计划检查
- 📦 批次处理状态
- ✅ 成功/❌ 失败统计

## 🛠️ 故障排除

### 常见问题

1. **邮件不发送**
   - 检查 `NEWSLETTER_FREQUENCY` 是否为 "disabled"
   - 验证 `NEWSLETTER_SEND_TIME` 格式是否正确 (HH:MM)
   - 确认 `RESEND_API_KEY` 已设置

2. **时间不准确**
   - 检查 `NEWSLETTER_TIMEZONE` 设置
   - 确认服务器时间是否正确

3. **发送失败率高**
   - 减少 `NEWSLETTER_MAX_RECIPIENTS_PER_BATCH`
   - 增加 `NEWSLETTER_BATCH_DELAY`
   - 检查 Resend API 配额

### 配置验证
系统会自动验证配置有效性，错误信息会在日志中显示。

## 🔧 高级配置

### 自定义时区
支持所有标准时区，例如：
- `America/New_York`
- `Europe/London`
- `Asia/Tokyo`

### 灵活发送时间
可以设置不同的发送时间：
- `06:00` - 早晨发送
- `12:00` - 午间发送
- `18:00` - 晚间发送

## 📈 性能优化

1. **批次优化**: 根据订阅者数量调整批次大小
2. **延迟控制**: 避免API频率限制
3. **重试策略**: 处理临时性发送失败
4. **内容限制**: 控制邮件大小和加载时间

---

✨ **提示**: 修改配置后需要重启服务器才能生效。建议在测试环境中先验证配置的正确性。
