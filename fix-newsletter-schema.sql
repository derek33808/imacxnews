-- 修复 Newsletter 订阅表结构
-- 添加缺失的 unsubscribeToken 字段

-- 检查 NewsSubscription 表是否存在，如果不存在则创建
DO $$
BEGIN
    -- 如果表不存在，创建完整的表
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'NewsSubscription') THEN
        CREATE TABLE "NewsSubscription" (
            "id" SERIAL NOT NULL,
            "userId" INTEGER NOT NULL,
            "email" TEXT NOT NULL,
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "unsubscribeToken" TEXT NOT NULL,
            "source" TEXT NOT NULL DEFAULT 'manual',
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,

            CONSTRAINT "NewsSubscription_pkey" PRIMARY KEY ("id")
        );

        -- 添加外键约束
        ALTER TABLE "NewsSubscription" ADD CONSTRAINT "NewsSubscription_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

        -- 添加唯一约束和索引
        ALTER TABLE "NewsSubscription" ADD CONSTRAINT "NewsSubscription_userId_key" UNIQUE ("userId");
        ALTER TABLE "NewsSubscription" ADD CONSTRAINT "NewsSubscription_unsubscribeToken_key" UNIQUE ("unsubscribeToken");

        CREATE INDEX "NewsSubscription_isActive_idx" ON "NewsSubscription"("isActive");
        CREATE INDEX "NewsSubscription_email_idx" ON "NewsSubscription"("email");
        CREATE INDEX "NewsSubscription_unsubscribeToken_idx" ON "NewsSubscription"("unsubscribeToken");
        
        RAISE NOTICE 'Created NewsSubscription table with all required fields';
    ELSE
        RAISE NOTICE 'NewsSubscription table exists, checking for missing fields...';
        
        -- 检查并添加 unsubscribeToken 字段
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'NewsSubscription' AND column_name = 'unsubscribeToken') THEN
            ALTER TABLE "NewsSubscription" ADD COLUMN "unsubscribeToken" TEXT;
            RAISE NOTICE 'Added unsubscribeToken column';
        END IF;
        
        -- 检查并添加 source 字段
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'NewsSubscription' AND column_name = 'source') THEN
            ALTER TABLE "NewsSubscription" ADD COLUMN "source" TEXT DEFAULT 'manual';
            RAISE NOTICE 'Added source column';
        END IF;
        
        -- 检查并添加 updatedAt 字段
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'NewsSubscription' AND column_name = 'updatedAt') THEN
            ALTER TABLE "NewsSubscription" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
            RAISE NOTICE 'Added updatedAt column';
        END IF;
        
        -- 为现有记录生成 unsubscribeToken（如果字段为空）
        UPDATE "NewsSubscription" 
        SET "unsubscribeToken" = encode(gen_random_bytes(32), 'hex')
        WHERE "unsubscribeToken" IS NULL OR "unsubscribeToken" = '';
        
        -- 添加约束（如果不存在）
        DO $inner$
        BEGIN
            -- 添加 NOT NULL 约束到 unsubscribeToken
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'NewsSubscription' AND column_name = 'unsubscribeToken' AND is_nullable = 'YES') THEN
                ALTER TABLE "NewsSubscription" ALTER COLUMN "unsubscribeToken" SET NOT NULL;
                RAISE NOTICE 'Set unsubscribeToken to NOT NULL';
            END IF;
            
            -- 添加唯一约束
            IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                          WHERE constraint_name = 'NewsSubscription_unsubscribeToken_key') THEN
                ALTER TABLE "NewsSubscription" ADD CONSTRAINT "NewsSubscription_unsubscribeToken_key" UNIQUE ("unsubscribeToken");
                RAISE NOTICE 'Added unique constraint on unsubscribeToken';
            END IF;
            
        EXCEPTION 
            WHEN others THEN
                RAISE NOTICE 'Some constraints may already exist: %', SQLERRM;
        END;
        $inner$;
        
        RAISE NOTICE 'NewsSubscription table schema updated successfully';
    END IF;
END
$$;
