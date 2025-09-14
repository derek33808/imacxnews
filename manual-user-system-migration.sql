-- ================================================================
-- IMACXNews 用户管理系统手动数据库迁移脚本
-- 执行日期：2025年
-- 说明：请按顺序执行以下SQL语句
-- ================================================================

-- 1. 创建新的枚举类型（如果不存在）
DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('NEW_ARTICLE', 'COMMENT_REPLY', 'SYSTEM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 修改User表，添加新字段
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "email" TEXT,
ADD COLUMN IF NOT EXISTS "displayName" TEXT,
ADD COLUMN IF NOT EXISTS "avatar" TEXT,
ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- 3. 为User表的email字段添加唯一约束（如果email字段不为空）
-- 先创建临时索引，然后转换为唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email") WHERE "email" IS NOT NULL;

-- 4. 为User表添加新索引
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

-- 5. 修改Comment表，添加回复功能支持
ALTER TABLE "Comment" 
ADD COLUMN IF NOT EXISTS "parentId" INTEGER;

-- 6. 为Comment表添加自引用外键约束（支持回复功能）
DO $$ BEGIN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" 
    FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 7. 为Comment表添加新索引
CREATE INDEX IF NOT EXISTS "Comment_articleId_createdAt_idx" ON "Comment"("articleId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX IF NOT EXISTS "Comment_parentId_idx" ON "Comment"("parentId");

-- 8. 修改ArticleLike表，添加时间戳
ALTER TABLE "ArticleLike" 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- 9. 为ArticleLike表添加新索引
CREATE INDEX IF NOT EXISTS "ArticleLike_createdAt_idx" ON "ArticleLike"("createdAt");

-- 10. 创建NewsSubscription表
CREATE TABLE IF NOT EXISTS "NewsSubscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsSubscription_pkey" PRIMARY KEY ("id")
);

-- 11. 为NewsSubscription表添加约束和索引
CREATE UNIQUE INDEX IF NOT EXISTS "NewsSubscription_userId_key" ON "NewsSubscription"("userId");
CREATE INDEX IF NOT EXISTS "NewsSubscription_isActive_idx" ON "NewsSubscription"("isActive");
CREATE INDEX IF NOT EXISTS "NewsSubscription_email_idx" ON "NewsSubscription"("email");

-- 12. 为NewsSubscription表添加外键约束
DO $$ BEGIN
    ALTER TABLE "NewsSubscription" ADD CONSTRAINT "NewsSubscription_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 13. 创建Notification表
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- 14. 为Notification表添加索引
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");

-- 15. 为Notification表添加外键约束
DO $$ BEGIN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 16. 更新现有数据（如果需要）
-- 为现有用户设置默认email（如果email字段为空）
-- 注意：您需要根据实际情况调整这个逻辑
UPDATE "User" SET 
    "email" = LOWER("username") || '@example.com'
WHERE "email" IS NULL AND "username" IS NOT NULL;

-- 17. 添加必要的触发器来自动更新updatedAt字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 为NewsSubscription表创建自动更新触发器
DO $$ BEGIN
    CREATE TRIGGER update_newssubscription_updated_at 
    BEFORE UPDATE ON "NewsSubscription" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================================
-- 验证脚本 - 执行完成后运行以下查询来验证表结构
-- ================================================================

-- 检查User表结构
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'User';

-- 检查新表是否创建成功
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('NewsSubscription', 'Notification');

-- 检查索引是否创建成功
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('User', 'Comment', 'ArticleLike', 'NewsSubscription', 'Notification');

-- ================================================================
-- 完成！用户管理系统数据库结构已更新
-- ================================================================
