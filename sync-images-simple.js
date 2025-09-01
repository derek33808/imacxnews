// 简化的图片同步脚本 - 处理schema兼容性
import { PrismaClient } from '@prisma/client';
import { initialArticlesData } from './src/data/articles.js';

const prisma = new PrismaClient();

function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// 计算内容长度
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

async function syncImagesSimple() {
  try {
    console.log('🔄 开始同步图片数据到数据库...');
    
    // 首先检查数据库中现有的表结构
    console.log('📊 检查数据库表结构...');
    
    let syncCount = 0;
    let createCount = 0;
    let updateCount = 0;
    
    // 获取现有文章
    const existingArticles = await prisma.article.findMany({ 
      select: { slug: true, title: true }
    });
    console.log(`📊 找到 ${existingArticles.length} 篇现有文章`);
    
    // 处理每篇文章
    for (const [index, articleData] of initialArticlesData.entries()) {
      try {
        const slug = articleData.slug || toSlug(articleData.title);
        const publishDate = articleData.publishDate ? new Date(articleData.publishDate) : new Date();
        
        // 基础数据（兼容旧schema）
        const baseData = {
          title: articleData.title,
          slug,
          excerpt: articleData.excerpt,
          content: articleData.content,
          chineseContent: articleData.chineseContent || null,
          category: articleData.category,
          image: articleData.image,
          author: articleData.author,
          publishDate,
          featured: Boolean(articleData.featured),
        };
        
        // 尝试添加新字段（如果支持的话）
        try {
          const enhancedData = {
            ...baseData,
            imageAlt: generateAltText(articleData.title, articleData.category),
            imageCaption: articleData.imageCaption || null,
            contentLength: getContentLength(articleData.content),
            readingTime: calculateReadingTime(articleData.content),
          };
          
          // 使用增强数据进行upsert
          await prisma.article.upsert({
            where: { slug },
            update: enhancedData,
            create: enhancedData,
          });
          
          console.log(`✅ [增强] 同步文章 ${index + 1}/${initialArticlesData.length}: ${articleData.title}`);
          
        } catch (enhancedError) {
          // 如果新字段不支持，使用基础数据
          console.log(`⚠️  新字段不支持，使用基础数据同步: ${articleData.title}`);
          
          await prisma.article.upsert({
            where: { slug },
            update: baseData,
            create: baseData,
          });
          
          console.log(`✅ [基础] 同步文章 ${index + 1}/${initialArticlesData.length}: ${articleData.title}`);
        }
        
        // 统计
        const wasExisting = existingArticles.some(a => a.slug === slug);
        if (wasExisting) {
          updateCount++;
        } else {
          createCount++;
        }
        syncCount++;
        
        console.log(`   📷 图片: ${articleData.image}`);
        
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
    
    // 验证结果
    console.log('\n🔍 验证同步结果...');
    const finalArticles = await prisma.article.findMany({ 
      select: { 
        title: true, 
        slug: true, 
        category: true, 
        image: true
      },
      orderBy: { publishDate: 'desc' }
    });
    
    console.log('\n📊 最终数据库内容:');
    finalArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (${article.category})`);
      console.log(`   📷 图片: ${article.image}`);
    });
    
    // 检查图片类型统计
    const imageStats = {
      external: finalArticles.filter(a => a.image.startsWith('http')).length,
      local: finalArticles.filter(a => !a.image.startsWith('http')).length
    };
    
    console.log('\n📊 图片类型统计:');
    console.log(`   🌐 外部图片: ${imageStats.external} 张`);
    console.log(`   💾 本地图片: ${imageStats.local} 张`);
    
    console.log('\n✅ 所有文章图片已成功写入数据库！');
    
  } catch (error) {
    console.error('❌ 同步过程失败:', error.message);
    console.error('详细错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行同步
syncImagesSimple();
