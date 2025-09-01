// 重置并同步文章数据
import { PrismaClient } from '@prisma/client';
import { initialArticlesData } from './src/data/articles.js';

const prisma = new PrismaClient({
  datasources: { 
    db: { 
      url: process.env.DATABASE_URL 
    } 
  }
});

function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

async function resetAndSync() {
  try {
    console.log('🗑️  第一步：删除所有现有文章...');
    
    // 先获取所有现有文章
    const existing = await prisma.article.findMany({ select: { id: true, title: true } });
    console.log(`找到 ${existing.length} 篇现有文章`);
    
    // 逐个删除，避免批量删除的prepared statement冲突
    for (const article of existing) {
      try {
        await prisma.article.delete({ where: { id: article.id } });
        console.log(`🗑️  删除: ${article.title}`);
      } catch (e) {
        console.warn(`⚠️  删除失败: ${article.title} - ${e.message}`);
      }
    }
    
    console.log('\n✅ 第一步完成：所有现有文章已删除');
    console.log('\n🔄 第二步：同步原始文章数据...');
    
    let created = 0;
    
    // 同步原始数据
    for (const [index, article] of initialArticlesData.entries()) {
      try {
        const slug = article.slug || toSlug(article.title);
        const publishDate = article.publishDate ? new Date(article.publishDate) : new Date();
        
        const data = {
          title: article.title,
          slug,
          excerpt: article.excerpt,
          content: article.content,
          chineseContent: article.chineseContent || null,
          category: article.category,
          image: article.image,
          author: article.author,
          publishDate,
          featured: Boolean(article.featured),
        };
        
        const result = await prisma.article.create({ data });
        created++;
        console.log(`✅ 创建文章 ${index + 1}/${initialArticlesData.length}: ${article.title}`);
      } catch (error) {
        console.error(`❌ 创建失败: ${article.title} - ${error.message}`);
      }
    }
    
    console.log(`\n🎉 同步完成！成功创建 ${created} 篇文章`);
    
    // 验证结果
    const final = await prisma.article.findMany({ 
      select: { title: true, slug: true, category: true },
      orderBy: { publishDate: 'desc' }
    });
    
    console.log('\n📊 最终数据库内容:');
    final.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (${article.category})`);
    });
    
  } catch (error) {
    console.error('❌ 重置同步过程失败:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndSync();
