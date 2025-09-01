// 应用数据库迁移并同步图片数据
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

// 计算内容长度（去除HTML标签）
function getContentLength(content) {
  const textContent = content.replace(/<[^>]*>/g, '');
  return textContent.length;
}

// 计算阅读时间
function calculateReadingTime(content) {
  const textContent = content.replace(/<[^>]*>/g, '');
  const chineseChars = (textContent.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = textContent.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(word => word.length > 0).length;
  
  const readingTimeMinutes = Math.ceil((chineseChars / 300) + (englishWords / 200));
  return Math.max(1, readingTimeMinutes);
}

// 生成图片alt文本
function generateAltText(title, category) {
  return `${title} - ${category === 'TodayNews' ? '今日新闻' : '往期新闻'}图片`;
}

async function migrateAndSyncImages() {
  try {
    console.log('🔄 第一步：检查数据库连接...');
    
    // 测试连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');
    
    console.log('\n🔄 第二步：获取现有文章...');
    const existingArticles = await prisma.article.findMany({ 
      select: { id: true, title: true, slug: true, image: true, imageAlt: true }
    });
    console.log(`📊 找到 ${existingArticles.length} 篇现有文章`);
    
    console.log('\n🔄 第三步：同步图片数据到数据库...');
    
    let syncCount = 0;
    let createCount = 0;
    let updateCount = 0;
    
    // 遍历原始文章数据
    for (const [index, articleData] of initialArticlesData.entries()) {
      try {
        const slug = articleData.slug || toSlug(articleData.title);
        const publishDate = articleData.publishDate ? new Date(articleData.publishDate) : new Date();
        
        // 计算增强字段
        const contentLength = getContentLength(articleData.content);
        const readingTime = calculateReadingTime(articleData.content);
        const imageAlt = generateAltText(articleData.title, articleData.category);
        
        const data = {
          title: articleData.title,
          slug,
          excerpt: articleData.excerpt,
          content: articleData.content,
          chineseContent: articleData.chineseContent || null,
          category: articleData.category,
          image: articleData.image,
          imageAlt,
          imageCaption: articleData.imageCaption || null,
          author: articleData.author,
          publishDate,
          featured: Boolean(articleData.featured),
          contentLength,
          readingTime,
        };
        
        // 使用upsert确保数据正确同步
        const result = await prisma.article.upsert({
          where: { slug },
          update: data,
          create: data,
          select: { id: true, title: true, image: true }
        });
        
        syncCount++;
        
        // 检查是否是创建还是更新
        const wasExisting = existingArticles.some(a => a.slug === slug);
        if (wasExisting) {
          updateCount++;
          console.log(`🔄 更新文章 ${index + 1}/${initialArticlesData.length}: ${articleData.title}`);
          console.log(`   📷 图片: ${articleData.image}`);
        } else {
          createCount++;
          console.log(`✅ 创建文章 ${index + 1}/${initialArticlesData.length}: ${articleData.title}`);
          console.log(`   📷 图片: ${articleData.image}`);
        }
        
      } catch (error) {
        console.error(`❌ 同步失败: ${articleData.title}`);
        console.error(`   错误: ${error.message}`);
      }
    }
    
    console.log(`\n🎉 图片同步完成！`);
    console.log(`📊 统计结果:`);
    console.log(`   ✅ 总计处理: ${syncCount} 篇文章`);
    console.log(`   🆕 新创建: ${createCount} 篇`);
    console.log(`   🔄 更新: ${updateCount} 篇`);
    
    // 验证同步结果
    console.log('\n🔍 第四步：验证图片数据...');
    const finalArticles = await prisma.article.findMany({ 
      select: { 
        title: true, 
        slug: true, 
        category: true, 
        image: true, 
        imageAlt: true,
        contentLength: true,
        readingTime: true
      },
      orderBy: { publishDate: 'desc' }
    });
    
    console.log('\n📊 最终数据库内容:');
    finalArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (${article.category})`);
      console.log(`   📷 图片: ${article.image}`);
      console.log(`   🏷️  Alt: ${article.imageAlt}`);
      console.log(`   📝 长度: ${article.contentLength} 字符`);
      console.log(`   ⏱️  阅读: ${article.readingTime} 分钟`);
      console.log('');
    });
    
    // 检查图片类型统计
    const imageStats = {
      external: finalArticles.filter(a => a.image.startsWith('http')).length,
      local: finalArticles.filter(a => !a.image.startsWith('http')).length
    };
    
    console.log('📊 图片类型统计:');
    console.log(`   🌐 外部图片: ${imageStats.external} 张`);
    console.log(`   💾 本地图片: ${imageStats.local} 张`);
    
  } catch (error) {
    console.error('❌ 迁移同步过程失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行迁移和同步
migrateAndSyncImages();
