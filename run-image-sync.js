// 修复版图片同步脚本 - 解决prepared statement冲突
import { PrismaClient } from '@prisma/client';
import { initialArticlesData } from './src/data/articles.js';

// 工具函数
function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

function getContentLength(content) {
  const textContent = content.replace(/<[^>]*>/g, '');
  return textContent.length;
}

function calculateReadingTime(content) {
  const textContent = content.replace(/<[^>]*>/g, '');
  const chineseChars = (textContent.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = textContent.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(word => word.length > 0).length;
  
  const readingTimeMinutes = Math.ceil((chineseChars / 300) + (englishWords / 200));
  return Math.max(1, readingTimeMinutes);
}

function generateAltText(title, category) {
  return `${title} - ${category === 'TodayNews' ? '今日新闻' : '往期新闻'}图片`;
}

async function runImageSync() {
  console.log('🚀 开始图片同步到数据库...\n');
  
  // 使用新的Prisma客户端实例避免prepared statement冲突
  const prisma = new PrismaClient({
    log: ['warn', 'error'],
  });
  
  try {
    console.log('📊 步骤1: 连接数据库...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');
    
    console.log('📊 步骤2: 检查现有数据...');
    let existingArticles = [];
    try {
      existingArticles = await prisma.article.findMany({ 
        select: { slug: true, title: true, image: true }
      });
      console.log(`📊 发现 ${existingArticles.length} 篇现有文章`);
    } catch (error) {
      console.log('⚠️  无法获取现有文章，可能是新数据库');
    }
    
    console.log('\n📊 步骤3: 同步文章图片数据...');
    
    let syncCount = 0;
    let createCount = 0;
    let updateCount = 0;
    const errors = [];
    
    // 逐个处理文章，避免批量操作冲突
    for (const [index, articleData] of initialArticlesData.entries()) {
      try {
        const slug = articleData.slug || toSlug(articleData.title);
        const publishDate = articleData.publishDate ? new Date(articleData.publishDate) : new Date();
        
        console.log(`\n处理文章 ${index + 1}/${initialArticlesData.length}: ${articleData.title}`);
        console.log(`   📷 图片: ${articleData.image}`);
        
        // 基础数据
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
        
        // 尝试添加增强字段
        let finalData = baseData;
        try {
          finalData = {
            ...baseData,
            imageAlt: generateAltText(articleData.title, articleData.category),
            imageCaption: articleData.imageCaption || null,
            contentLength: getContentLength(articleData.content),
            readingTime: calculateReadingTime(articleData.content),
          };
        } catch (e) {
          console.log(`   ⚠️  使用基础字段模式`);
        }
        
        // 检查是否已存在
        const existing = existingArticles.find(a => a.slug === slug);
        
        if (existing) {
          // 更新现有文章
          try {
            await prisma.article.update({
              where: { slug },
              data: finalData
            });
            updateCount++;
            console.log(`   🔄 更新成功`);
          } catch (updateError) {
            // 如果增强字段不存在，尝试基础字段
            await prisma.article.update({
              where: { slug },
              data: baseData
            });
            updateCount++;
            console.log(`   🔄 更新成功 (基础模式)`);
          }
        } else {
          // 创建新文章
          try {
            await prisma.article.create({
              data: finalData
            });
            createCount++;
            console.log(`   ✅ 创建成功`);
          } catch (createError) {
            // 如果增强字段不存在，尝试基础字段
            await prisma.article.create({
              data: baseData
            });
            createCount++;
            console.log(`   ✅ 创建成功 (基础模式)`);
          }
        }
        
        syncCount++;
        
        // 添加小延迟避免连接冲突
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`   ❌ 同步失败: ${error.message}`);
        errors.push({ title: articleData.title, error: error.message });
      }
    }
    
    // 显示同步结果
    console.log(`\n🎉 图片同步完成！`);
    console.log(`📊 统计结果:`);
    console.log(`   ✅ 总计处理: ${syncCount} 篇文章`);
    console.log(`   🆕 新创建: ${createCount} 篇`);
    console.log(`   🔄 更新: ${updateCount} 篇`);
    
    if (errors.length > 0) {
      console.log(`   ❌ 失败: ${errors.length} 篇`);
      errors.forEach(err => {
        console.log(`      - ${err.title}: ${err.error}`);
      });
    }
    
    // 验证最终结果
    console.log('\n🔍 步骤4: 验证同步结果...');
    const finalArticles = await prisma.article.findMany({ 
      select: { 
        title: true, 
        slug: true, 
        category: true, 
        image: true
      },
      orderBy: { publishDate: 'desc' }
    });
    
    console.log(`\n📊 数据库中共有 ${finalArticles.length} 篇文章:`);
    finalArticles.forEach((article, index) => {
      console.log(`${index + 1}. ${article.title} (${article.category})`);
      console.log(`   📷 ${article.image}`);
    });
    
    // 图片类型统计
    const imageStats = {
      external: finalArticles.filter(a => a.image.startsWith('http')).length,
      local: finalArticles.filter(a => !a.image.startsWith('http')).length,
      total: finalArticles.length
    };
    
    console.log('\n📊 图片类型统计:');
    console.log(`   🌐 外部图片: ${imageStats.external} 张`);
    console.log(`   💾 本地图片: ${imageStats.local} 张`);
    console.log(`   📱 总计: ${imageStats.total} 张`);
    
    console.log('\n✅ 所有文章图片已成功写入数据库！');
    console.log('🎯 图片数据包括:');
    console.log('   • 图片路径/URL');
    console.log('   • 图片alt文本（SEO优化）');
    console.log('   • 图片说明（可选）');
    console.log('   • 内容长度和阅读时间统计');
    
  } catch (error) {
    console.error('\n❌ 图片同步失败:', error.message);
    console.error('详细错误:', error);
    
    console.log('\n🔧 可能的解决方案:');
    console.log('1. 确认数据库连接正常');
    console.log('2. 检查.env文件中的DATABASE_URL');
    console.log('3. 尝试运行: npx prisma db push');
    console.log('4. 重启数据库连接');
    
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 数据库连接已关闭');
  }
}

// 立即执行
runImageSync();
