// 简单直接的图片同步脚本
import { PrismaClient } from '@prisma/client';
import { initialArticlesData } from './src/data/articles.js';

console.log('🚀 开始图片同步...');

// 创建独立的Prisma客户端
const prisma = new PrismaClient();

const results = [];

try {
  console.log('📊 连接数据库...');
  await prisma.$connect();
  console.log('✅ 数据库连接成功');
  
  console.log(`📋 准备同步 ${initialArticlesData.length} 篇文章`);
  
  for (let i = 0; i < initialArticlesData.length; i++) {
    const article = initialArticlesData[i];
    
    console.log(`\n📄 处理第 ${i + 1} 篇: ${article.title}`);
    console.log(`📷 图片: ${article.image}`);
    
    try {
      const slug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      // 检查是否已存在
      const existing = await prisma.article.findUnique({
        where: { slug: slug }
      });
      
      const data = {
        title: article.title,
        slug: slug,
        excerpt: article.excerpt,
        content: article.content,
        chineseContent: article.chineseContent || null,
        category: article.category,
        image: article.image,
        author: article.author,
        publishDate: article.publishDate ? new Date(article.publishDate) : new Date(),
        featured: Boolean(article.featured)
      };
      
      if (existing) {
        // 更新现有文章
        const updated = await prisma.article.update({
          where: { slug: slug },
          data: data
        });
        console.log(`🔄 更新成功: ID ${updated.id}`);
        results.push({ action: 'updated', title: article.title, id: updated.id });
      } else {
        // 创建新文章
        const created = await prisma.article.create({
          data: data
        });
        console.log(`✅ 创建成功: ID ${created.id}`);
        results.push({ action: 'created', title: article.title, id: created.id });
      }
      
      // 添加小延迟避免冲突
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ 处理失败: ${error.message}`);
      results.push({ action: 'failed', title: article.title, error: error.message });
    }
  }
  
  // 显示最终结果
  console.log('\n🎉 同步完成！');
  console.log('📊 处理结果:');
  
  const created = results.filter(r => r.action === 'created');
  const updated = results.filter(r => r.action === 'updated');
  const failed = results.filter(r => r.action === 'failed');
  
  console.log(`✅ 创建: ${created.length} 篇`);
  console.log(`🔄 更新: ${updated.length} 篇`);
  console.log(`❌ 失败: ${failed.length} 篇`);
  
  if (failed.length > 0) {
    console.log('\n❌ 失败的文章:');
    failed.forEach(f => console.log(`   - ${f.title}: ${f.error}`));
  }
  
  // 验证数据库内容
  console.log('\n🔍 验证数据库内容:');
  const allArticles = await prisma.article.findMany({
    select: { id: true, title: true, image: true, category: true },
    orderBy: { id: 'asc' }
  });
  
  console.log(`📊 数据库中共有 ${allArticles.length} 篇文章:`);
  allArticles.forEach((article, index) => {
    console.log(`${index + 1}. [ID:${article.id}] ${article.title}`);
    console.log(`   📷 ${article.image}`);
    console.log(`   🏷️  ${article.category}`);
  });
  
  // 图片类型统计
  const externalImages = allArticles.filter(a => a.image.startsWith('http')).length;
  const localImages = allArticles.filter(a => !a.image.startsWith('http')).length;
  
  console.log('\n📊 图片类型统计:');
  console.log(`🌐 外部图片: ${externalImages} 张`);
  console.log(`💾 本地图片: ${localImages} 张`);
  console.log(`📱 总计: ${allArticles.length} 张`);
  
  console.log('\n✅ 所有文章图片已成功写入数据库！');
  
} catch (error) {
  console.error('\n❌ 同步过程失败:', error.message);
  console.error('详细错误:', error);
} finally {
  await prisma.$disconnect();
  console.log('\n🔌 数据库连接已关闭');
}
