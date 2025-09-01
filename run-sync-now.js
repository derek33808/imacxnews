// 立即运行图片同步 - 自执行版本
import { PrismaClient } from '@prisma/client';

// 从文件导入文章数据
const initialArticlesData = [
  {
    id: 1,
    title: "Reading Challenge Announcement for Grade 5",
    slug: "reading-challenge-announcement",
    excerpt: "Important information about the upcoming reading challenges for students advancing to Grade 5, including both Chinese and English reading requirements.",
    content: `<p>According to the briefing session of the fourth grade to the fifth grade last Friday, we learned that in terms of reading, Chinese needs to complete one million words of reading challenges and English needs to complete thirty reading challenges. These reading challenges require us to reasonably arrange our completion progress and track the reading progress throughout the year. This is far from the progress of a book in the fourth grade. The teacher also suggested that everyone should start training their typing and reading skills during the holiday. So please be mentally prepared.</p>`,
    chineseContent: `<p>根据上周五的四年级升五年级的说明会我们了解到在阅读方面中文要完成一百万字的阅读挑战英文要完成三十本身的阅读挑战这些阅读挑战需要我们合理的安排我们的完成进度，并且在整个年度内跟踪阅读进展。这与我们现在四年级一本一本书的进展要拉开很大的距离。老师还建议大家在假期就开始训练自己的打字能力和阅读能力。所以还请大家做好心理准备。</p>`,
    category: "TodayNews",
    image: "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-15T13:00:00Z",
    featured: true
  },
  {
    id: 2,
    title: "Dali Trip Preparation Updates",
    slug: "dali-trip-updates",
    excerpt: "Important updates regarding the upcoming Dali trip, including packing requirements and accommodation details at Dali Xifuyuan Boutique B&B.",
    content: `<p>With the passage of time, the trip to Dali is also slowly coming. I believe everyone should be ready. This week, the teacher will also explain to us the last notes about Dali. Finally, let me remind you.</p>
    
    <p>You can only bring a suitcase and a backpack for this trip. ELECTRONIC PRODUCTS CAN ONLY BE A WATCH AND A SCHOOL IPAD. You can't go to the hotel. There are TVs in most rooms. The name of the hotel is Dali Xifuyuan Boutique B&B.</p>`,
    chineseContent: `<p>随着时间的流逝大理之行也慢慢到来，相信大家应该也都做好了准备。就在这周老师也要向我们交代关于大理的最后注意事项。最后提醒一下大家这次旅行只能带一个要托运的行李行箱和一个背包。电子产品也只能带手表和学校IPAD。不能在酒店里串门。大部份房间有电视。酒店的名字是大理喜福苑精品民宿。</p>`,
    category: "TodayNews",
    image: "/IMG_1325.jpeg",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-14T12:00:00Z",
    featured: true
  },
  {
    id: 3,
    title: "IMACX News Website Development with AI",
    slug: "imacx-news-ai-website",
    excerpt: "With the gradual development of artificial intelligence, IMACX News has created its website using AI technology, now entering the final stage of deployment.",
    content: `<p>With the slow development of artificial intelligence, we have also created our website with artificial intelligence. Now that our website has entered the last stage of lifting restrictions, it is expected that it will soon be displayed on our school's IPAD. You can now search our IMACX NEWS website. To receive the latest news, you just need to refresh the web page every Sunday night, and the latest news will appear in front of you.</p>`,
    chineseContent: `<p>随着人工智能的慢慢发展我们也用人工智能创造出了我们的网站。现在我们的网站已经进入了最后一个解除限制的阶段预计很快就可以呈现在我们的学校IPAD上了，你现在可以通过搜索进入我们的IMACX NEWS网站。要想收到最新的新闻，你只需在每周日晚上刷新网页，最新的新闻就会浮现在你眼前。</p>`,
    category: "PastNews",
    image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-10T10:00:00Z",
    featured: false
  },
  {
    id: 4,
    title: "Folk Music Experience Project at The World School",
    slug: "folk-music-project",
    excerpt: "Danny, a primary school music teacher, plans to launch a folk music experience project during J term to promote cultural exchange.",
    content: `<p>It is understood that during the J term, Danny, a music teacher in primary school, plans to carry out a folk music experience project to promote cultural exchanges between China and the West and publicize the beauty of traditional Chinese culture. In order to better display folk music, we are now recruiting folk music performers from the Aven community. For details, please contact the IMACX news reporter.</p>`,
    chineseContent: `<p>据了解在J term期间，小学部音乐老师Danny老师计划开展民乐体验项目，借此促进中西方文化交流，宣传中华传统文化之美。为了更好的进行民乐展示，现向爱文社区招募民乐演奏者，详情可联络IMACX新闻记者。</p>`,
    category: "PastNews",
    image: "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=800",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-08T09:00:00Z",
    featured: false
  },
  {
    id: 5,
    title: "Military News: China's J-15A Fighter Jet Performance",
    slug: "china-j15a-fighter-performance",
    excerpt: "Analysis of China's J-15A fighter jet capabilities and recent developments in naval aviation technology.",
    content: `<p>Recent reports indicate significant advancements in China's naval aviation capabilities with the deployment of the J-15A fighter jet. This enhanced variant demonstrates improved avionics systems and combat effectiveness compared to its predecessors.</p>
    
    <p>The J-15A represents a crucial step in modernizing China's carrier-based fighter fleet, featuring upgraded radar systems, enhanced weapons integration capabilities, and improved operational reliability for extended maritime missions.</p>`,
    chineseContent: `<p>最新报告显示，随着歼-15A战斗机的部署，中国海军航空兵能力取得了重大进展。与前身相比，这种增强型变体展示了改进的航空电子系统和作战效力。</p>
    
    <p>歼-15A在现代化中国舰载战斗机机队方面迈出了关键一步，具有升级的雷达系统、增强的武器集成能力以及改进的长距离海上任务作战可靠性。</p>`,
    category: "PastNews", 
    image: "/IMG_1324.jpeg",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-05T08:00:00Z",
    featured: false
  }
];

async function executeSync() {
  console.log('🚀 开始图片数据库同步...');
  console.log('=' .repeat(50));
  
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 正在连接数据库...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功!\n');
    
    console.log(`📋 准备同步 ${initialArticlesData.length} 篇文章的图片数据`);
    console.log('-'.repeat(50));
    
    let created = 0;
    let updated = 0;
    let failed = 0;
    
    for (let i = 0; i < initialArticlesData.length; i++) {
      const article = initialArticlesData[i];
      const progress = `[${i + 1}/${initialArticlesData.length}]`;
      
      console.log(`\n${progress} 处理文章: ${article.title}`);
      console.log(`     📷 图片: ${article.image}`);
      console.log(`     🏷️  分类: ${article.category}`);
      
      try {
        const slug = article.slug || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        
        // 构建文章数据
        const articleData = {
          title: article.title,
          slug: slug,
          excerpt: article.excerpt,
          content: article.content,
          chineseContent: article.chineseContent || null,
          category: article.category,
          image: article.image,
          author: article.author,
          publishDate: new Date(article.publishDate),
          featured: Boolean(article.featured)
        };
        
        // 检查是否已存在
        const existingArticle = await prisma.article.findUnique({
          where: { slug: slug },
          select: { id: true, title: true }
        });
        
        if (existingArticle) {
          // 更新现有文章
          await prisma.article.update({
            where: { slug: slug },
            data: articleData
          });
          updated++;
          console.log(`     🔄 更新成功 (ID: ${existingArticle.id})`);
        } else {
          // 创建新文章
          const newArticle = await prisma.article.create({
            data: articleData
          });
          created++;
          console.log(`     ✅ 创建成功 (ID: ${newArticle.id})`);
        }
        
        // 短暂延迟避免数据库冲突
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        failed++;
        console.log(`     ❌ 处理失败: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 图片同步完成！');
    console.log('📊 处理结果统计:');
    console.log(`   ✅ 新创建: ${created} 篇`);
    console.log(`   🔄 更新: ${updated} 篇`);
    console.log(`   ❌ 失败: ${failed} 篇`);
    console.log(`   📱 总计: ${created + updated} 篇成功`);
    
    // 验证最终结果
    console.log('\n🔍 验证数据库内容...');
    const allArticles = await prisma.article.findMany({
      select: { id: true, title: true, image: true, category: true },
      orderBy: { publishDate: 'desc' }
    });
    
    console.log(`\n📊 数据库中现有 ${allArticles.length} 篇文章:`);
    allArticles.forEach((article, index) => {
      console.log(`${index + 1}. [ID:${article.id}] ${article.title}`);
      console.log(`   📷 ${article.image}`);
      console.log(`   🏷️  ${article.category}`);
    });
    
    // 图片类型统计
    const externalImages = allArticles.filter(a => a.image.startsWith('http')).length;
    const localImages = allArticles.filter(a => !a.image.startsWith('http')).length;
    
    console.log('\n📊 图片存储类型统计:');
    console.log(`   🌐 外部图片 (HTTP/HTTPS): ${externalImages} 张`);
    console.log(`   💾 本地图片 (相对路径): ${localImages} 张`);
    console.log(`   📱 图片总数: ${allArticles.length} 张`);
    
    console.log('\n✅ 所有文章图片已成功写入数据库！');
    console.log('🎯 数据包含:');
    console.log('   • 图片完整路径/URL');
    console.log('   • 文章标题和内容');
    console.log('   • 分类信息');
    console.log('   • 发布时间');
    console.log('   • 作者信息');
    
  } catch (error) {
    console.error('\n❌ 同步过程失败:');
    console.error('错误信息:', error.message);
    if (error.code) {
      console.error('错误代码:', error.code);
    }
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 数据库连接已安全关闭');
    console.log('=' .repeat(50));
  }
}

// 立即执行
executeSync();
