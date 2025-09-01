-- 直接添加缺失的字段到Article表
ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS "imageAlt" TEXT,
ADD COLUMN IF NOT EXISTS "imageCaption" TEXT,
ADD COLUMN IF NOT EXISTS "contentLength" INTEGER,
ADD COLUMN IF NOT EXISTS "readingTime" INTEGER;

-- 创建索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_category_idx" ON "Article"("category");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_featured_idx" ON "Article"("featured");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_publishDate_idx" ON "Article"("publishDate");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Article_contentLength_idx" ON "Article"("contentLength");
