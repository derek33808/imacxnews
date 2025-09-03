import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

// 需要添加的3篇文章
const missingArticles = [
  {
    title: "Reading Challenge Announcement for Grade 5",
    slug: "reading-challenge-announcement",
    excerpt: "Important information about the upcoming reading challenges for students advancing to Grade 5, including both Chinese and English reading requirements.",
    content: `<p>According to the briefing session of the fourth grade to the fifth grade last Friday, we learned that in terms of reading, Chinese needs to complete one million words of reading challenges and English needs to complete thirty reading challenges. These reading challenges require us to reasonably arrange our completion progress and track the reading progress throughout the year. This is far from the progress of a book in the fourth grade. The teacher also suggested that everyone should start training their typing and reading skills during the holiday. So please be mentally prepared.</p>`,
    chineseContent: `<p>根据上周五的四年级升五年级的说明会我们了解到在阅读方面中文要完成一百万字的阅读挑战英文要完成三十本身的阅读挑战这些阅读挑战需要我们合理的安排我们的完成进度，并且在整个年度内跟踪阅读进展。这与我们现在四年级一本一本书的进展要拉开很大的距离。老师还建议大家在假期就开始训练自己的打字能力和阅读能力。所以还请大家做好心理准备。</p>`,
    category: "TodayNews",
    image: "https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-15T13:00:00Z",
    featured: true,
    imageAlt: "Books and reading materials related to Reading Challenge Announcement for Grade 5",
    contentLength: 580,
    readingTime: 3
  },
  {
    title: "Dali Trip Preparation Updates",
    slug: "dali-trip-updates",
    excerpt: "Important updates regarding the upcoming Dali trip, including packing requirements and accommodation details at Dali Xifuyuan Boutique B&B.",
    content: `<p>With the passage of time, the trip to Dali is also slowly coming. I believe everyone should be ready. This week, the teacher will also explain to us the last notes about Dali. Finally, let me remind you.</p><p>You can only bring a suitcase and a backpack for this trip. ELECTRONIC PRODUCTS CAN ONLY BE A WATCH AND A SCHOOL IPAD. You can't go to the hotel. There are TVs in most rooms. The name of the hotel is Dali Xifuyuan Boutique B&B.</p>`,
    chineseContent: `<p>随着时间的流逝大理之行也慢慢到来，相信大家应该也都做好了准备。就在这周老师也要向我们交代关于大理的最后注意事项。最后提醒一下大家这次旅行只能带一个要托运的行李行箱和一个背包。电子产品也只能带手表和学校IPAD。不能在酒店里串门。大部份房间有电视。酒店的名字是大理喜福苑精品民宿。</p>`,
    category: "TodayNews",
    image: "/IMG_1325.jpeg",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-14T12:00:00Z",
    featured: true,
    imageAlt: "Photo illustration for Dali Trip Preparation Updates",
    contentLength: 420,
    readingTime: 2
  },
  {
    title: "IMACX News Website Development with AI",
    slug: "imacx-news-ai-website",
    excerpt: "With the gradual development of artificial intelligence, IMACX News has created its website using AI technology, now entering the final stage of deployment.",
    content: `<p>With the slow development of artificial intelligence, we have also created our website with artificial intelligence. Now that our website has entered the last stage of lifting restrictions, it is expected that it will soon be displayed on our school's IPAD. You can now search our IMACX NEWS website. To receive the latest news, you just need to refresh the web page every Sunday night, and the latest news will appear in front of you.</p>`,
    chineseContent: `<p>随着人工智能的慢慢发展我们也用人工智能创造出了我们的网站。现在我们的网站已经进入了最后一个解除限制的阶段预计很快就可以呈现在我们的学校IPAD上了，你现在可以通过搜索进入我们的IMACX NEWS网站。要想收到最新的新闻，你只需在每周日晚上刷新网页，最新的新闻就会浮现在你眼前。</p>`,
    category: "PastNews",
    image: "https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800",
    author: "Max and ISAAC and Corum",
    publishDate: "2025-01-10T10:00:00Z",
    featured: false,
    imageAlt: "Computer and technology illustration for IMACX News Website Development with AI",
    contentLength: 320,
    readingTime: 2
  }
];

try {
  await client.connect();
  console.log('📝 添加缺失的前端文章...\n');
  
  for (let i = 0; i < missingArticles.length; i++) {
    const article = missingArticles[i];
    console.log(`${i + 1}. 添加: ${article.title}`);
    
    try {
      const result = await client.query(`
        INSERT INTO "Article" (
          title, slug, excerpt, content, "chineseContent", 
          category, image, author, "publishDate", featured,
          "imageAlt", "contentLength", "readingTime"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, title
      `, [
        article.title, article.slug, article.excerpt, article.content,
        article.chineseContent, article.category, article.image, article.author,
        article.publishDate, article.featured, article.imageAlt,
        article.contentLength, article.readingTime
      ]);
      
      console.log(`   ✅ 成功 - ID: ${result.rows[0].id}`);
    } catch (error) {
      console.log(`   ❌ 失败: ${error.message}`);
    }
  }
  
  // 检查最终结果
  const final = await client.query(`
    SELECT id, title, slug, category, featured, "imageAlt", "contentLength", "readingTime"
    FROM "Article" 
    ORDER BY "publishDate" DESC
  `);
  
  console.log(`\n📊 最终结果 - 共 ${final.rows.length} 篇文章:`);
  final.rows.forEach((row, index) => {
    console.log(`   ${index + 1}. ${row.title}`);
    console.log(`      📎 ${row.slug} | ${row.category} ${row.featured ? '⭐' : ''}`);
    console.log(`      🏷️ Alt: ${row.imageAlt ? '✅' : '❌'} | 长度: ${row.contentLength || '❌'} | 时间: ${row.readingTime || '❌'}`);
  });
  
  if (final.rows.length === 5) {
    console.log('\n🎉 ✅ 完美！数据库现在有5篇完整的文章！');
  }
  
} catch (error) {
  console.log('❌ 操作失败:', error.message);
} finally {
  await client.end();
}
