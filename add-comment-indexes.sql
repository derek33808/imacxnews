-- 评论系统性能优化 - 安全的数据库索引添加
-- 这些索引只会提升性能，不会影响现有功能

-- 1. 优化评论查询 - 按文章ID和创建时间排序
CREATE INDEX IF NOT EXISTS "Comment_articleId_createdAt_idx" 
ON "Comment" ("articleId", "createdAt" DESC);

-- 2. 优化回复查询 - 按父评论ID查找回复
CREATE INDEX IF NOT EXISTS "Comment_parentId_createdAt_idx" 
ON "Comment" ("parentId", "createdAt" ASC) 
WHERE "parentId" IS NOT NULL;

-- 3. 优化顶级评论查询 - 只查询主评论（非回复）
CREATE INDEX IF NOT EXISTS "Comment_articleId_parentId_idx" 
ON "Comment" ("articleId", "parentId") 
WHERE "parentId" IS NULL;

-- 4. 优化用户评论查询
CREATE INDEX IF NOT EXISTS "Comment_userId_createdAt_idx" 
ON "Comment" ("userId", "createdAt" DESC);

-- 执行说明：
-- 这些索引是安全的，只会提升查询性能，不会改变任何业务逻辑
-- 可以在生产环境直接执行，不会影响现有功能
