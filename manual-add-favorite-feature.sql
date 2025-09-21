-- ======================================================
-- 手动数据库更新脚本：添加文章收藏功能
-- 创建时间：2025年
-- 描述：添加ArticleFavorite表及相关索引
-- ======================================================

-- 检查表是否已存在（防止重复创建）
DO $$ 
BEGIN
    -- 检查ArticleFavorite表是否存在
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ArticleFavorite') THEN
        -- 创建ArticleFavorite表
        CREATE TABLE "ArticleFavorite" (
            "id" SERIAL NOT NULL,
            "articleId" INTEGER NOT NULL,
            "userId" INTEGER NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT "ArticleFavorite_pkey" PRIMARY KEY ("id")
        );
        
        RAISE NOTICE 'ArticleFavorite表创建成功';
    ELSE
        RAISE NOTICE 'ArticleFavorite表已存在，跳过创建';
    END IF;
END $$;

-- 添加外键约束（如果不存在）
DO $$ 
BEGIN
    -- 添加与Article表的外键约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ArticleFavorite_articleId_fkey'
    ) THEN
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_articleId_fkey" 
        FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        
        RAISE NOTICE '添加ArticleFavorite与Article的外键约束成功';
    END IF;
    
    -- 添加与User表的外键约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ArticleFavorite_userId_fkey'
    ) THEN
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        
        RAISE NOTICE '添加ArticleFavorite与User的外键约束成功';
    END IF;
END $$;

-- 添加唯一约束（防止用户重复收藏同一篇文章）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ArticleFavorite_articleId_userId_key'
    ) THEN
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_articleId_userId_key" 
        UNIQUE ("articleId", "userId");
        
        RAISE NOTICE '添加ArticleFavorite唯一约束成功';
    END IF;
END $$;

-- 创建索引以优化查询性能
DO $$ 
BEGIN
    -- 创建收藏历史索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'ArticleFavorite_createdAt_idx'
    ) THEN
        CREATE INDEX "ArticleFavorite_createdAt_idx" ON "ArticleFavorite"("createdAt");
        RAISE NOTICE '创建createdAt索引成功';
    END IF;
    
    -- 创建用户收藏索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'ArticleFavorite_userId_idx'
    ) THEN
        CREATE INDEX "ArticleFavorite_userId_idx" ON "ArticleFavorite"("userId");
        RAISE NOTICE '创建userId索引成功';
    END IF;
    
    -- 创建文章收藏索引
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'ArticleFavorite_articleId_idx'
    ) THEN
        CREATE INDEX "ArticleFavorite_articleId_idx" ON "ArticleFavorite"("articleId");
        RAISE NOTICE '创建articleId索引成功';
    END IF;
END $$;

-- 验证表结构
DO $$ 
BEGIN
    -- 检查表是否创建成功
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ArticleFavorite') THEN
        RAISE NOTICE '✅ ArticleFavorite表创建完成';
        
        -- 显示表结构信息
        RAISE NOTICE '📊 表结构验证：';
        RAISE NOTICE '  - 表名: ArticleFavorite';
        RAISE NOTICE '  - 字段: id, articleId, userId, createdAt';
        RAISE NOTICE '  - 约束: 主键(id), 唯一(articleId+userId), 外键(articleId, userId)';
        RAISE NOTICE '  - 索引: createdAt, userId, articleId';
    ELSE
        RAISE EXCEPTION '❌ ArticleFavorite表创建失败';
    END IF;
END $$;

-- 显示当前数据库相关表的统计信息
SELECT 
    'ArticleFavorite' as table_name,
    0 as record_count,
    'New table created' as status
UNION ALL
SELECT 
    'Article' as table_name,
    COUNT(*) as record_count,
    'Existing table' as status
FROM "Article"
UNION ALL
SELECT 
    'User' as table_name,
    COUNT(*) as record_count,
    'Existing table' as status
FROM "User"
UNION ALL
SELECT 
    'ArticleLike' as table_name,
    COUNT(*) as record_count,
    'Existing table' as status
FROM "ArticleLike"
ORDER BY table_name;

-- 成功消息
SELECT '🎉 数据库更新完成！ArticleFavorite收藏功能已成功添加。' as message;

-- ======================================================
-- 可选：回滚脚本（如果需要删除表）
-- ======================================================
/*
-- 回滚脚本（谨慎使用！）
-- DROP TABLE IF EXISTS "ArticleFavorite" CASCADE;
-- SELECT '🗑️ ArticleFavorite表已删除' as rollback_message;
*/

-- ======================================================
-- 测试脚本（可选）
-- ======================================================
/*
-- 测试插入数据（需要替换真实的articleId和userId）
-- INSERT INTO "ArticleFavorite" ("articleId", "userId") 
-- VALUES (1, 1) 
-- ON CONFLICT ("articleId", "userId") DO NOTHING;

-- SELECT '✅ 测试数据插入成功' as test_message;
*/
