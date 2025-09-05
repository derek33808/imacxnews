# Netlify Today News 404 问题调试指南

## 问题描述
远端 Netlify 上的 today news 页面在某些浏览器中显示 404 错误。

## 根本原因分析
1. **SSR 配置缺失**：Astro SSR 项目需要特定的 Netlify 重定向规则
2. **URL 变体问题**：用户可能访问不同的 URL 格式（today-news vs TodayNews）
3. **缺少 fallback 处理**：没有适当的服务器路由 fallback

## 已实施的修复

### 1. 更新 netlify.toml 配置
```toml
# API 路由重定向
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/entry"
  status = 200

# Today News URL 变体重定向
[[redirects]]
  from = "/category/today-news"
  to = "/category/TodayNews"
  status = 301

[[redirects]]
  from = "/category/todaynews"
  to = "/category/TodayNews"
  status = 301

# SSR fallback
[[redirects]]
  from = "/*"
  to = "/.netlify/functions/entry"
  status = 200
```

## 如何在 Netlify 中调试

### 1. 登录 Netlify Dashboard
```bash
# 如果还未安装 Netlify CLI
npm install -g netlify-cli

# 登录到 Netlify
netlify login
```

### 2. 查看部署日志
1. 访问 Netlify Dashboard
2. 选择你的项目
3. 查看 "Deploys" 标签页
4. 点击最新的部署查看详细日志

### 3. 实时日志监控
```bash
# 在项目目录中运行
netlify logs --live
```

### 4. 测试不同的 URL 变体
在浏览器中测试以下 URL：
- `/category/TodayNews` (正确格式)
- `/category/today-news` (应该重定向)
- `/category/todaynews` (应该重定向)

### 5. 检查函数日志
```bash
# 查看函数执行日志
netlify functions:logs
```

## 验证步骤

### 1. 本地验证
```bash
# 构建并预览
npm run build
npm run preview
```

### 2. 部署到 Netlify
```bash
# 部署到生产环境
git add .
git commit -m "fix: 修复 today news 页面 404 问题"
git push origin main
```

### 3. 测试各种浏览器
- Chrome
- Firefox  
- Safari
- Edge

## 常见问题和解决方案

### 1. 404 仍然出现
- 检查 Netlify 函数是否正常运行
- 验证重定向规则是否生效
- 查看服务器日志

### 2. 重定向循环
- 检查重定向规则的顺序
- 确保没有冲突的规则

### 3. 缓存问题
- 清除浏览器缓存
- 等待 CDN 缓存失效（通常 5-15 分钟）

## 监控建议

1. **设置 Netlify Analytics** 监控 404 错误
2. **配置错误追踪** 使用 Sentry 或类似工具
3. **定期检查日志** 确保没有新的错误

## 联系支持

如果问题持续存在：
1. 查看 Netlify 状态页面：https://status.netlify.com/
2. 联系 Netlify 支持：https://answers.netlify.com/
3. 检查 Astro Discord 社区获取 SSR 帮助
