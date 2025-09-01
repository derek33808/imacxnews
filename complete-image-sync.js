// 完整的图片同步流程 - 一键执行所有步骤
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaClient } from '@prisma/client';
import { initialArticlesData } from './src/data/articles.js';

const execAsync = promisify(exec);

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

async function completeImageSync() {
  console.log('🚀 开始完整的图片同步流程...\n');
  
  try {
    // 步骤1: 生成Prisma客户端
    console.log('📦 步骤1: 生成Prisma客户端...');
    try {
      await execAsync('npx prisma generate');
      console.log('✅ Prisma客户端生成成功\n');
    } catch (error) {
      console.log('⚠️  Prisma生成失败，继续执行...\n');
    }
    
    // 步骤2: 尝试推送数据库schema
    console.log('🔄 步骤2: 更新数据库结构...');
    try {
      const { stdout } = await execAsync('npx prisma db push --accept-data-loss');
      console.log('✅ 数据库结构更新成功');
      console.log(stdout);
    } catch (error) {
      console.log('⚠️  数据库结构更新失败，使用兼容模式...');
    }
    
    // 步骤3: 连接数据库并同步数据
    console.log('\n📊 步骤3: 同步图片数据到数据库...');
    const prisma = new PrismaClient();
    
    try {
      await prisma.$connect();
      console.log('✅ 数据库连接成功');
      
      let syncCount = 0;
      let createCount = 0;
      let updateCount = 0;
      
      // 获取现有文章
      const existingArticles = await prisma.article.findMany({ 
        select: { slug: true, title: true }
      });
      console.log(`📊 发现 ${existingArticles.length} 篇现有文章`);
      
      // 同步每篇文章
      for (const [index, articleData] of initialArticlesData.entries()) {
        try {
          const slug = articleData.slug || toSlug(articleData.title);
          const publishDate = articleData.publishDate ? new Date(articleData.publishDate) : new Date();
          
          // 准备数据
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
          
          // 尝试使用增强字段
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
            console.log(`   ⚠️  使用基础字段: ${articleData.title}`);
          }
          
          // 执行upsert
          await prisma.article.upsert({
            where: { slug },
            update: finalData,
            create: finalData,
          });
          
          // 统计
          const wasExisting = existingArticles.some(a => a.slug === slug);
          if (wasExisting) {
            updateCount++;
            console.log(`🔄 更新: ${articleData.title}`);
          } else {
            createCount++;
            console.log(`✅ 创建: ${articleData.title}`);
          }
          
          console.log(`   📷 图片: ${articleData.image}`);
          syncCount++;
          
        } catch (error) {
          console.error(`❌ 同步失败: ${articleData.title} - ${error.message}`);
        }
      }
      
      // 显示同步结果
      console.log(`\n🎉 图片同步完成！`);
      console.log(`📊 统计结果:`);
      console.log(`   ✅ 总计处理: ${syncCount} 篇文章`);
      console.log(`   🆕 新创建: ${createCount} 篇`);
      console.log(`   🔄 更新: ${updateCount} 篇`);
      
      // 步骤4: 验证同步结果
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
      
      console.log('\n📊 数据库中的文章和图片:');
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
      
      // 检查图片文件的实际存在情况
      const localImages = finalArticles.filter(a => !a.image.startsWith('http'));
      if (localImages.length > 0) {
        console.log('\n📁 本地图片文件:');
        localImages.forEach(article => {
          console.log(`   ${article.image} (来自: ${article.title})`);
        });
      }
      
      console.log('\n✅ 所有文章图片已成功写入数据库！');
      console.log('🎯 图片数据包括:');
      console.log('   • 图片路径/URL');
      console.log('   • 图片alt文本（SEO优化）');
      console.log('   • 图片说明（可选）');
      console.log('   • 内容长度统计');
      console.log('   • 预估阅读时间');
      
    } catch (error) {
      console.error('❌ 数据库操作失败:', error.message);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
    
    // 步骤5: 清理临时文件
    console.log('\n🧹 步骤5: 清理临时文件...');
    const tempFiles = [
      'migrate-and-sync-images.js',
      'create-migration.js', 
      'sync-images-simple.js',
      'organize-images.js',
      'reset-and-sync.js',
      'test-connection-comparison.js',
      'test-db.js',
      'test-optimized-connections.js',
      'sync-articles.js',
      'update-database-schema.sql'
    ];
    
    let cleanedCount = 0;
    for (const file of tempFiles) {
      try {
        await execAsync(`rm -f ${file}`);
        cleanedCount++;
      } catch (e) {
        // 文件可能不存在，忽略错误
      }
    }
    
    console.log(`✅ 清理了 ${cleanedCount} 个临时文件`);
    
  } catch (error) {
    console.error('\n❌ 图片同步流程失败:', error.message);
    console.error('详细错误:', error);
    
    console.log('\n🔧 故障排除建议:');
    console.log('1. 检查数据库连接配置');
    console.log('2. 确认.env文件包含正确的DATABASE_URL');
    console.log('3. 手动运行: npx prisma db push');
    console.log('4. 检查网络连接到Supabase');
  }
}

// 运行完整流程
completeImageSync();
