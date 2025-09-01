-- 为Article表添加图片元数据和内容统计字段
-- 此脚本用于手动更新现有数据库结构

-- 添加图片相关字段
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "imageAlt" TEXT;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "imageCaption" TEXT;

-- 添加内容统计字段
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "contentLength" INTEGER;
ALTER TABLE "Article" ADD COLUMN IF NOT EXISTS "readingTime" INTEGER;

-- 创建性能优化索引
CREATE INDEX IF NOT EXISTS "Article_category_idx" ON "Article"("category");
CREATE INDEX IF NOT EXISTS "Article_featured_idx" ON "Article"("featured");
CREATE INDEX IF NOT EXISTS "Article_publishDate_idx" ON "Article"("publishDate");
CREATE INDEX IF NOT EXISTS "Article_contentLength_idx" ON "Article"("contentLength");

-- 验证字段已添加
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Article' 
ORDER BY ordinal_position;
