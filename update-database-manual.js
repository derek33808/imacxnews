// 手动数据库更新脚本 - 添加ArticleFavorite收藏表
import { PrismaClient } from '@prisma/client';

async function updateDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 开始手动更新数据库...');
    
    // 1. 创建ArticleFavorite表
    console.log('📝 创建ArticleFavorite表...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ArticleFavorite" (
        "id" SERIAL NOT NULL,
        "articleId" INTEGER NOT NULL,
        "userId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT "ArticleFavorite_pkey" PRIMARY KEY ("id")
      );
    `;
    console.log('✅ ArticleFavorite表创建成功');

    // 2. 添加外键约束
    console.log('🔗 添加外键约束...');
    
    // 与Article表的外键
    try {
      await prisma.$executeRaw`
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_articleId_fkey" 
        FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      `;
      console.log('✅ 添加与Article的外键约束成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('ℹ️ Article外键约束已存在');
      } else {
        console.log('⚠️ Article外键约束添加失败:', e.message);
      }
    }
    
    // 与User表的外键
    try {
      await prisma.$executeRaw`
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      `;
      console.log('✅ 添加与User的外键约束成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('ℹ️ User外键约束已存在');
      } else {
        console.log('⚠️ User外键约束添加失败:', e.message);
      }
    }

    // 3. 添加唯一约束
    console.log('🔒 添加唯一约束...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "ArticleFavorite" 
        ADD CONSTRAINT "ArticleFavorite_articleId_userId_key" 
        UNIQUE ("articleId", "userId");
      `;
      console.log('✅ 添加唯一约束成功');
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('ℹ️ 唯一约束已存在');
      } else {
        console.log('⚠️ 唯一约束添加失败:', e.message);
      }
    }

    // 4. 创建索引
    console.log('📊 创建索引...');
    
    const indexes = [
      {
        name: 'ArticleFavorite_createdAt_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "ArticleFavorite_createdAt_idx" ON "ArticleFavorite"("createdAt");',
        description: 'createdAt索引'
      },
      {
        name: 'ArticleFavorite_userId_idx', 
        sql: 'CREATE INDEX IF NOT EXISTS "ArticleFavorite_userId_idx" ON "ArticleFavorite"("userId");',
        description: 'userId索引'
      },
      {
        name: 'ArticleFavorite_articleId_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "ArticleFavorite_articleId_idx" ON "ArticleFavorite"("articleId");',
        description: 'articleId索引'
      }
    ];

    for (const index of indexes) {
      try {
        await prisma.$executeRaw(index.sql);
        console.log(`✅ 创建${index.description}成功`);
      } catch (e) {
        console.log(`⚠️ ${index.description}创建失败:`, e.message);
      }
    }

    // 5. 验证表结构
    console.log('🔍 验证表结构...');
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ArticleFavorite'
      );
    `;
    
    if (tableExists[0].exists) {
      console.log('✅ ArticleFavorite表验证成功');
      
      // 显示统计信息
      console.log('\n📊 数据库统计信息:');
      
      const stats = await Promise.all([
        prisma.article.count(),
        prisma.user.count(), 
        prisma.articleLike.count(),
        prisma.$queryRaw`SELECT COUNT(*) FROM "ArticleFavorite";`
      ]);
      
      console.log(`  - 文章数量: ${stats[0]}`);
      console.log(`  - 用户数量: ${stats[1]}`);
      console.log(`  - 点赞数量: ${stats[2]}`);
      console.log(`  - 收藏数量: ${stats[3][0].count}`);
      
    } else {
      throw new Error('ArticleFavorite表验证失败');
    }

    console.log('\n🎉 数据库更新完成！收藏功能已成功添加。');
    console.log('🔧 现在可以使用收藏相关的API了。');
    
  } catch (error) {
    console.error('❌ 数据库更新失败:', error);
    console.error('💡 请检查数据库连接和权限设置');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行更新
updateDatabase().catch(error => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});
