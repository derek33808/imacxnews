import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// 前端文章数据
const frontendArticles = [
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
    image: "https://images.pexels.com/photos/7520935/pexels-photo-7520935.jpeg?auto=compress&cs=tinysrgb&w=800",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-08T09:00:00Z",
    featured: false
  },
  {
    id: 5,
    title: "Military News: China's J-15A Fighter Jet Performance",
    slug: "china-j15a-fighter-performance",
    excerpt: "Recent developments in military aviation as China's J-15A demonstrates superior capabilities against French fighter jets.",
    content: `<p>According to what I heard recently, Pakistan is having an India-Pakistan conflict with India and starting a war. Because Pakistan has a good relationship with China, Pakistan bought China's fighter J-15 A, while India heard that France's fighter jets are better than China's, so India bought a French fighter. It is said to be an invincible fighter, but do you know the result? China's J-15 A (with only one fighter) shot down six French "invincible" fighter jets, none of which was lost. Now India is falling into a country with a very, very lack of military power. Pakistan's official (Prime Minister) even claimed on its official website that if it had not been for their mercy, they could have shot down 10 French fighter jets. It seems that the strength of our motherland is still unable to resist, and it is only J-15 A. If it is J-20, or even the future J-25, J-30 and J-35, then isn't China invincible? Sure enough, China is the world's largest military power!</p>
    
    <p>It is said that the Indian government is now plotting a plan to buy more Chinese J-15A than Pakistan. They think that China's J-15A is like the power of the gods, which cannot be destroyed and is simply invincible. When India lost six "invincible" French fighter jets, they even had to be in debt to buy China's J-15 A. I wonder if India can defeat Pakistan now? Let's wait and see!</p>
    
    <p>Think about two questions: If Pakistan had bought a J-20 or something else at that time, what would have been "interesting"? If China does not sell the J-15 A to India, will India explode?</p>`,
    chineseContent: `<p>据报最近听说的情况，巴基斯坦正在和印度发生一个印巴冲突并且开始打仗了。因为巴基斯坦和中国关系比较好，所以巴基斯坦购买了中国的战斗机歼15 A，而印度听说法国的战斗机号称比中国的好，所以印度购买了法国一种号称无敌的战斗机，可是结果你知道吗？中国生产的歼15 A（仅用一架战斗机）击落了六架法国"无敌"战斗机而一架都没有损失，现在印度正陷入一个军事力非常非常缺乏的国家。巴基斯坦官方（首相）甚至在官网上宣称，要不是他们手下留情，本来可以击落10架，法国战斗机的。看来我们祖国的实力还是无法抵抗的，而且这只是歼15 A，如果是歼20，甚至未来的歼25歼30歼35，那么中国岂不是天下无敌了？果然中国是世界第一军事大国呀！</p>
    
    <p>据说现在印度政府正在密谋一个计划，就是购买比巴基斯坦还多的中国歼15 A。他们觉得中国的歼15 A就跟神明的力量一样，无法摧毁，简直无敌。而在当印度损失了六架"无敌"法国战斗机时，他们甚至都要欠债才能买下中国的歼15 A，不知道现在印度能否将巴基斯坦打败？让我们拭目以待！</p>
    
    <p>考虑个问题：如果当时巴基斯坦买的是歼20或别的，那么又会发生什么样"有趣"的事呢？如果中国不卖给印度歼15 A，那印度是不是就炸毛了？</p>`,
    category: "PastNews",
    image: "https://images.pexels.com/photos/76971/fighter-jet-fighter-aircraft-f-16-falcon-aircraft-76971.jpeg?auto=compress&cs=tinysrgb&w=800",
    author: "Max and ISAAC",
    publishDate: "2025-01-05T14:30:00Z",
    featured: false
  }
];

// 图片工具类
class ImageManager {
  static getContentLength(content) {
    const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return textContent.length;
  }
  
  static calculateReadingTime(contentLength) {
    const wordsPerMinute = 200;
    const minutes = Math.ceil(contentLength / wordsPerMinute);
    return Math.max(1, minutes);
  }
  
  static generateAltText(title, image) {
    if (image.includes('books') || image.includes('reading')) {
      return `Books and reading materials related to ${title}`;
    } else if (image.includes('fighter') || image.includes('aircraft')) {
      return `Fighter aircraft illustration for ${title}`;
    } else if (image.includes('music')) {
      return `Traditional music instruments for ${title}`;
    } else if (image.includes('computer') || image.includes('website')) {
      return `Computer and technology illustration for ${title}`;
    } else if (image.includes('IMG_')) {
      return `Photo illustration for ${title}`;
    } else {
      return `Illustration for article: ${title}`;
    }
  }
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🚀 开始前端文章完整同步...\n');
  
  // 步骤1: 删除测试文章
  console.log('🧹 第一步: 清理测试文章...');
  const testArticleIds = [1, 3, 4]; // Hello A2 Updated, Test Online, aaaaa
  
  for (const id of testArticleIds) {
    const result = await client.query('DELETE FROM "Article" WHERE id = $1 RETURNING title', [id]);
    if (result.rows.length > 0) {
      console.log(`   ✅ 删除测试文章: ${result.rows[0].title}`);
    }
  }
  
  console.log('\n📝 第二步: 同步前端文章...');
  
  // 步骤2: 同步前端文章
  for (const article of frontendArticles) {
    console.log(`\n处理文章: ${article.title}`);
    
    // 计算图片和内容数据
    const contentLength = ImageManager.getContentLength(article.content);
    const readingTime = ImageManager.calculateReadingTime(contentLength);
    const imageAlt = ImageManager.generateAltText(article.title, article.image);
    
    const query = `
      INSERT INTO "Article" (
        title, slug, excerpt, content, "chineseContent", 
        category, image, author, "publishDate", featured,
        "imageAlt", "contentLength", "readingTime"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      )
      ON CONFLICT (slug) 
      DO UPDATE SET
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        "chineseContent" = EXCLUDED."chineseContent",
        category = EXCLUDED.category,
        image = EXCLUDED.image,
        author = EXCLUDED.author,
        "publishDate" = EXCLUDED."publishDate",
        featured = EXCLUDED.featured,
        "imageAlt" = EXCLUDED."imageAlt",
        "contentLength" = EXCLUDED."contentLength",
        "readingTime" = EXCLUDED."readingTime"
      RETURNING id, title
    `;
    
    const values = [
      article.title,
      article.slug,
      article.excerpt,
      article.content,
      article.chineseContent,
      article.category,
      article.image,
      article.author,
      article.publishDate,
      article.featured,
      imageAlt,
      contentLength,
      readingTime
    ];
    
    try {
      const result = await client.query(query, values);
      console.log(`   ✅ 同步成功 - ID: ${result.rows[0].id}`);
      console.log(`      📊 内容长度: ${contentLength}`);
      console.log(`      ⏱️ 阅读时间: ${readingTime} 分钟`);
      console.log(`      🏷️ Alt文本: ${imageAlt.substring(0, 50)}...`);
    } catch (error) {
      console.log(`   ❌ 同步失败: ${error.message}`);
    }
  }
  
  // 步骤3: 验证最终结果
  console.log('\n🔍 第三步: 验证同步结果...');
  
  const finalResult = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT("imageAlt") as has_alt,
      COUNT("contentLength") as has_length,
      COUNT("readingTime") as has_time
    FROM "Article"
  `);
  
  const stats = finalResult.rows[0];
  console.log('\n📊 最终统计结果:');
  console.log(`   📰 总文章数: ${stats.total}`);
  console.log(`   🏷️ 有Alt文本: ${stats.has_alt}/${stats.total}`);
  console.log(`   📊 有内容长度: ${stats.has_length}/${stats.total}`);
  console.log(`   ⏱️ 有阅读时间: ${stats.has_time}/${stats.total}`);
  
  // 显示所有文章
  const allArticles = await client.query(`
    SELECT title, slug, category, featured
    FROM "Article" 
    ORDER BY "publishDate" DESC
  `);
  
  console.log('\n📄 数据库中的所有文章:');
  allArticles.rows.forEach((row, index) => {
    console.log(`   ${index + 1}. ${row.title} (${row.category})`);
    console.log(`      📎 ${row.slug} ${row.featured ? '⭐ 推荐' : ''}`);
  });
  
  if (stats.total === 5 && stats.has_alt === '5') {
    console.log('\n🎉 ✅ 前端文章同步完全成功！');
  } else {
    console.log('\n⚠️ 同步过程中可能存在问题，请检查');
  }
  
} catch (error) {
  console.log('❌ 同步失败:', error.message);
} finally {
  await client.end();
  console.log('\n🔌 同步完成');
}
