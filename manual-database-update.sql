-- =====================================================
-- 手动数据库更新：添加社交互动功能
-- 创建ArticleFavorite收藏表
-- 执行方式：在Supabase SQL编辑器中运行此脚本
-- =====================================================

-- 1. 检查并创建ArticleFavorite表
CREATE TABLE IF NOT EXISTS "ArticleFavorite" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL, 
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ArticleFavorite_pkey" PRIMARY KEY ("id")
);

-- 2. 添加外键约束（如果不存在）
DO $$ 
BEGIN
    -- 检查并添加与Article表的外键约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ArticleFavorite_articleId_fkey' 
        AND table_name = 'ArticleFavorite'
    ) THEN
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_articleId_fkey" 
        FOREIGN KEY ("articleId") REFERENCES "Article"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    -- 检查并添加与User表的外键约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ArticleFavorite_userId_fkey'
        AND table_name = 'ArticleFavorite'
    ) THEN
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 3. 添加唯一约束（防止重复收藏）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ArticleFavorite_articleId_userId_key'
        AND table_name = 'ArticleFavorite'
    ) THEN
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_articleId_userId_key" 
        UNIQUE ("articleId", "userId");
    END IF;
END $$;

-- 4. 创建性能优化索引
CREATE INDEX IF NOT EXISTS "ArticleFavorite_createdAt_idx" 
ON "ArticleFavorite"("createdAt");

CREATE INDEX IF NOT EXISTS "ArticleFavorite_userId_idx" 
ON "ArticleFavorite"("userId");

CREATE INDEX IF NOT EXISTS "ArticleFavorite_articleId_idx" 
ON "ArticleFavorite"("articleId");

-- 5. 验证创建结果
SELECT 
    'ArticleFavorite' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'ArticleFavorite'
        ) THEN '✅ 创建成功'
        ELSE '❌ 创建失败'
    END as status;

-- 6. 显示当前所有相关表的记录数
SELECT 
    'Article' as table_name,
    COUNT(*) as record_count
FROM "Article"
UNION ALL
SELECT 
    'User' as table_name,
    COUNT(*) as record_count
FROM "User"
UNION ALL
SELECT 
    'ArticleLike' as table_name,
    COUNT(*) as record_count
FROM "ArticleLike"
UNION ALL
SELECT 
    'Comment' as table_name,
    COUNT(*) as record_count
FROM "Comment"
UNION ALL
SELECT 
    'ArticleFavorite' as table_name,
    COUNT(*) as record_count
FROM "ArticleFavorite"
ORDER BY table_name;

-- 🎉 完成提示
SELECT '🎉 数据库更新完成！ArticleFavorite收藏表已成功创建。' as result;
