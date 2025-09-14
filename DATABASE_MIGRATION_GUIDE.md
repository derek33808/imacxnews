# 🗄️ 数据库手动迁移指南

## 📋 概述
由于自动迁移失败，我们提供了手动SQL脚本来更新数据库结构以支持用户管理系统。

## 🚀 执行方法

### 方法一：通过Supabase Dashboard（推荐）

1. **访问Supabase Dashboard**
   - 登录您的Supabase项目
   - 进入 `SQL Editor`

2. **执行SQL脚本**
   - 打开 `manual-user-system-migration.sql` 文件
   - 复制所有内容
   - 粘贴到SQL Editor中
   - 点击 `Run` 执行

3. **验证执行结果**
   - 检查是否有错误信息
   - 查看新表是否创建成功

### 方法二：通过psql命令行

```bash
# 连接到数据库
psql "your-database-connection-string"

# 执行脚本
\i manual-user-system-migration.sql

# 退出
\q
```

### 方法三：通过Prisma DB Push（如果连接正常）

```bash
# 强制推送schema到数据库
npx prisma db push --force-reset

# 或者尝试
npx prisma db push --skip-generate
```

## ✅ 验证迁移成功

执行以下SQL查询来验证迁移是否成功：

```sql
-- 检查User表新字段
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'User' 
ORDER BY ordinal_position;

-- 检查新表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('NewsSubscription', 'Notification');

-- 检查枚举类型
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'NotificationType'::regtype;
```

## 🔧 可能遇到的问题和解决方案

### 问题1：Email字段约束冲突
如果现有User表中有重复的username，可能导致email约束失败。

**解决方案：**
```sql
-- 清理重复数据
UPDATE "User" SET 
    "email" = "username" || '+' || "id" || '@example.com'
WHERE "email" IS NULL;
```

### 问题2：外键约束失败
如果现有数据存在关联性问题。

**解决方案：**
```sql
-- 检查孤儿记录
SELECT * FROM "Comment" WHERE "userId" NOT IN (SELECT "id" FROM "User");
SELECT * FROM "ArticleLike" WHERE "userId" NOT IN (SELECT "id" FROM "User");

-- 删除孤儿记录（谨慎操作）
-- DELETE FROM "Comment" WHERE "userId" NOT IN (SELECT "id" FROM "User");
```

### 问题3：权限不足
确保数据库用户有以下权限：
- CREATE TABLE
- ALTER TABLE  
- CREATE INDEX
- CREATE TYPE

## 📊 迁移后的数据库结构

### 新增字段：
- **User表**：email, displayName, avatar, lastLoginAt
- **Comment表**：parentId (支持回复)
- **ArticleLike表**：createdAt (点赞时间)

### 新增表：
- **NewsSubscription**：用户订阅管理
- **Notification**：站内通知系统

### 新增枚举：
- **NotificationType**：通知类型枚举

## 🎯 完成后的下一步

1. **更新Prisma Client**
   ```bash
   npx prisma generate
   ```

2. **启动开发服务器测试**
   ```bash
   npm run dev
   ```

3. **测试用户注册功能**
   - 访问网站
   - 点击"Sign Up"按钮
   - 填写注册信息
   - 验证登录功能

如果遇到任何问题，请提供具体的错误信息！
