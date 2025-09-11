# Supabase 存储设置指南

## 🚨 问题描述
生产环境出现 `Internal Error. ID: 01KM0ZFJ32Y970640ATYY0X53` 错误，这是 Supabase 存储服务的内部错误。

## 🔍 常见原因
1. **环境变量未配置**：缺少 `SUPABASE_SERVICE_ROLE_KEY`
2. **存储桶不存在**：`imacx-media` 存储桶未创建
3. **权限策略错误**：RLS (Row Level Security) 策略阻止上传
4. **服务角色权限不足**：service_role 密钥无效或权限不够

## ✅ 解决方案

### 步骤 1: 配置环境变量

#### Netlify 部署
1. 登录 Netlify Dashboard
2. 进入你的站点设置
3. 点击 **Site Settings** > **Environment Variables**
4. 添加以下环境变量：

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
MAX_IMAGE_SIZE=10485760
MAX_VIDEO_SIZE=52428800
ENABLE_VIDEO_NEWS=true
```

#### 获取 Supabase 配置信息
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **Settings** > **API**
4. 复制：
   - **Project URL** → `SUPABASE_URL`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **重要**：使用 `service_role` 密钥，不是 `anon` 密钥！

### 步骤 2: 创建存储桶和设置权限

#### 方法 A: 使用自动化脚本（推荐）
```bash
# 1. 设置环境变量（本地测试）
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 2. 运行设置脚本
node setup-supabase-storage.js
```

#### 方法 B: 手动设置
1. 登录 Supabase Dashboard
2. 进入 **Storage**
3. 创建新存储桶：
   - **Name**: `imacx-media`
   - **Public**: ✅ 启用
   - **File size limit**: 50MB
   - **Allowed MIME types**: `image/*,video/*`

4. 设置存储策略：
   - 进入 **Storage** > **Policies**
   - 为 `imacx-media` 桶创建策略：
   
   ```sql
   -- 允许 service_role 完全访问
   CREATE POLICY "Allow service role full access" 
   ON storage.objects 
   FOR ALL 
   TO service_role 
   USING (bucket_id = 'imacx-media');
   
   -- 允许公开读取
   CREATE POLICY "Allow public read access" 
   ON storage.objects 
   FOR SELECT 
   TO public 
   USING (bucket_id = 'imacx-media');
   ```

### 步骤 3: 验证设置

#### 诊断工具
```bash
# 运行诊断脚本检查配置
node diagnose-supabase.js
```

#### 手动测试
1. 尝试上传小文件
2. 检查浏览器控制台错误
3. 验证文件是否出现在 Supabase Storage 中

## 🛠️ 故障排除

### 错误：`SUPABASE_SERVICE_ROLE_KEY environment variable not set`
**解决**：在 Netlify 环境变量中添加 `SUPABASE_SERVICE_ROLE_KEY`

### 错误：`Bucket 'imacx-media' not found`
**解决**：创建 `imacx-media` 存储桶或运行 `setup-supabase-storage.js`

### 错误：`Permission denied`
**解决**：检查存储策略，确保 `service_role` 有完全权限

### 错误：`File too large`
**解决**：
1. 检查存储桶文件大小限制
2. 调整 `MAX_IMAGE_SIZE` 和 `MAX_VIDEO_SIZE` 环境变量

## 📋 完整的环境变量清单

```bash
# 数据库
DATABASE_URL=postgresql://postgres:password@host:port/database

# JWT 认证
JWT_SECRET=your-super-secret-jwt-key

# 管理员账户
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-strong-password

# Supabase 存储
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# 上传限制
MAX_IMAGE_SIZE=10485760    # 10MB
MAX_VIDEO_SIZE=52428800    # 50MB
ENABLE_VIDEO_NEWS=true
```

## 🚀 部署后验证

1. **重新部署站点**：环境变量更改后需要重新部署
2. **测试上传功能**：尝试上传图片和视频
3. **检查存储**：在 Supabase Dashboard 中确认文件已上传
4. **监控日志**：查看 Netlify Functions 日志确认无错误

## 🆘 仍有问题？

如果按照以上步骤操作后仍有问题：

1. **检查 Supabase 服务状态**：[status.supabase.com](https://status.supabase.com)
2. **查看详细日志**：Netlify Functions 日志中的具体错误信息
3. **验证网络连接**：确保 Netlify 可以访问 Supabase
4. **联系支持**：提供完整的错误日志和配置信息

## 🔧 维护脚本

项目包含以下维护脚本：
- `diagnose-supabase.js` - 诊断存储配置
- `setup-supabase-storage.js` - 自动设置存储桶和权限

定期运行这些脚本以确保存储服务正常工作。
