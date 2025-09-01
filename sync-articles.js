// 同步文章到数据库脚本
import { PrismaClient } from '@prisma/client';
import { initialArticlesData } from './src/data/articles.js';

const prisma = new PrismaClient();

async function syncArticlesToDatabase() {
  console.log('🔄 开始同步文章到数据库...\n');
  
  let createdCount = 0;
  let updatedCount = 0;
  const errors = [];

  try {
    for (const articleData of initialArticlesData) {
      const { id, ...dataToUpsert } = articleData;
      const slug = dataToUpsert.slug || String(dataToUpsert.title)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

      try {
        console.log(`📝 正在同步: ${dataToUpsert.title}`);
        
        const result = await prisma.article.upsert({
          where: { slug: slug },
          update: {
            ...dataToUpsert,
            publishDate: new Date(dataToUpsert.publishDate),
          },
          create: {
            ...dataToUpsert,
            slug: slug,
            publishDate: new Date(dataToUpsert.publishDate),
          },
        });
        
        if (result) {
          // 检查是否是创建还是更新
          const existing = await prisma.article.findMany({
            where: { slug: slug }
          });
          
          if (existing.length === 1) {
            createdCount++;
            console.log(`✅ 创建成功: ${result.title}`);
          } else {
            updatedCount++;
            console.log(`🔄 更新成功: ${result.title}`);
          }
        }
      } catch (innerError) {
        console.error(`❌ 同步失败: ${slug}`, innerError.message);
        errors.push(`Failed to sync article ${slug}: ${innerError.message}`);
      }
    }
    
    console.log(`\n🎉 同步完成！`);
    console.log(`📊 统计:`);
    console.log(`  - 创建: ${createdCount} 篇文章`);
    console.log(`  - 更新: ${updatedCount} 篇文章`);
    console.log(`  - 错误: ${errors.length} 个`);
    
    if (errors.length > 0) {
      console.log(`\n❌ 错误详情:`);
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
  } catch (error) {
    console.error('❌ 同步过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncArticlesToDatabase().catch(console.error);
