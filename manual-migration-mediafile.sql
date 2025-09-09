-- 🆕 Media Center 手动数据库迁移脚本
-- 执行日期：2024-12-20
-- 目的：创建 MediaFile 表用于媒体文件管理

-- 1. 创建 MediaFile 表
CREATE TABLE IF NOT EXISTS "MediaFile" (
    -- 主键
    "id" SERIAL PRIMARY KEY,
    
    -- 文件基本信息
    "filename" TEXT NOT NULL,              -- 原始文件名
    "url" TEXT NOT NULL,                   -- Supabase存储URL
    "path" TEXT NOT NULL,                  -- 存储路径
    
    -- 媒体类型信息
    "mediaType" TEXT NOT NULL,             -- 'IMAGE' | 'VIDEO'
    "mimeType" TEXT NOT NULL,              -- image/jpeg, video/mp4等
    "fileSize" INTEGER NOT NULL,           -- 文件大小(bytes)
    
    -- 元数据
    "title" TEXT,                          -- 文件标题（可选）
    "category" TEXT NOT NULL DEFAULT 'misc', -- 分类，默认为misc
    
    -- 管理信息
    "uploadedBy" INTEGER NOT NULL,         -- 上传者ID (关联User表)
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 上传时间
    "usageCount" INTEGER NOT NULL DEFAULT 0 -- 使用次数
);

-- 2. 创建外键约束
-- 关联到 User 表的 uploadedBy 字段
ALTER TABLE "MediaFile" 
ADD CONSTRAINT "MediaFile_uploadedBy_fkey" 
FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. 创建索引以优化查询性能
-- 媒体类型索引（用于按图片/视频筛选）
CREATE INDEX "MediaFile_mediaType_idx" ON "MediaFile"("mediaType");

-- 上传时间索引（用于按时间排序）
CREATE INDEX "MediaFile_uploadedAt_idx" ON "MediaFile"("uploadedAt");

-- 分类索引（用于按分类筛选）
CREATE INDEX "MediaFile_category_idx" ON "MediaFile"("category");

-- 上传者索引（用于查询某用户上传的文件）
CREATE INDEX "MediaFile_uploadedBy_idx" ON "MediaFile"("uploadedBy");

-- 4. 插入一些示例数据（可选，用于测试）
-- 注意：请根据你的实际User表中的管理员ID调整 uploadedBy 值

-- 检查是否存在管理员用户
-- SELECT id, username, role FROM "User" WHERE role = 'ADMIN' LIMIT 1;

-- 示例数据插入（请先确认管理员用户ID）
-- INSERT INTO "MediaFile" (
--     "filename", 
--     "url", 
--     "path", 
--     "mediaType", 
--     "mimeType", 
--     "fileSize", 
--     "title", 
--     "category", 
--     "uploadedBy"
-- ) VALUES (
--     'sample-image.jpg',
--     'https://your-supabase-url.com/sample-image.jpg',
--     'articles/sample-image.jpg',
--     'IMAGE',
--     'image/jpeg',
--     1024000,
--     'Sample Image',
--     'articles',
--     1  -- 请替换为实际的管理员用户ID
-- );

-- 5. 验证表创建成功
-- 检查表结构
-- \d "MediaFile"

-- 检查索引
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'MediaFile';

-- 检查约束
-- SELECT conname, contype FROM pg_constraint WHERE conrelid = '"MediaFile"'::regclass;

COMMIT;
