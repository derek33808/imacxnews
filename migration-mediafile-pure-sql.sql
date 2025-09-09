-- 🆕 Media Center 纯SQL数据库迁移脚本
-- 适用于 Supabase Dashboard 和其他SQL编辑器
-- 执行日期：2024-12-20

-- 1. 创建 MediaFile 表
CREATE TABLE IF NOT EXISTS "MediaFile" (
    -- 主键
    "id" SERIAL PRIMARY KEY,
    
    -- 文件基本信息
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    
    -- 媒体类型信息
    "mediaType" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    
    -- 元数据
    "title" TEXT,
    "category" TEXT NOT NULL DEFAULT 'misc',
    
    -- 管理信息
    "uploadedBy" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usageCount" INTEGER NOT NULL DEFAULT 0
);

-- 2. 创建外键约束
ALTER TABLE "MediaFile" 
ADD CONSTRAINT "MediaFile_uploadedBy_fkey" 
FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. 创建索引以优化查询性能
CREATE INDEX "MediaFile_mediaType_idx" ON "MediaFile"("mediaType");
CREATE INDEX "MediaFile_uploadedAt_idx" ON "MediaFile"("uploadedAt");
CREATE INDEX "MediaFile_category_idx" ON "MediaFile"("category");
CREATE INDEX "MediaFile_uploadedBy_idx" ON "MediaFile"("uploadedBy");
