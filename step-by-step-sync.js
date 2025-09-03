import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🚀 开始分步同步...\n');
  
  // 步骤1: 先清理测试文章
  console.log('🧹 清理测试文章...');
  
  const deleteQuery = `DELETE FROM "Article" WHERE id IN (1, 3, 4)`;
  const deleteResult = await client.query(deleteQuery);
  console.log(`✅ 删除了 ${deleteResult.rowCount} 篇测试文章\n`);
  
  // 步骤2: 添加第一篇文章
  console.log('📝 添加第一篇文章...');
  
  const article1Query = `
    INSERT INTO "Article" (
      title, slug, excerpt, content, "chineseContent", 
      category, image, author, "publishDate", featured,
      "imageAlt", "contentLength", "readingTime"
    ) VALUES (
      'Reading Challenge Announcement for Grade 5',
      'reading-challenge-announcement',
      'Important information about the upcoming reading challenges for students advancing to Grade 5, including both Chinese and English reading requirements.',
      '<p>According to the briefing session of the fourth grade to the fifth grade last Friday, we learned that in terms of reading, Chinese needs to complete one million words of reading challenges and English needs to complete thirty reading challenges. These reading challenges require us to reasonably arrange our completion progress and track the reading progress throughout the year. This is far from the progress of a book in the fourth grade. The teacher also suggested that everyone should start training their typing and reading skills during the holiday. So please be mentally prepared.</p>',
      '<p>根据上周五的四年级升五年级的说明会我们了解到在阅读方面中文要完成一百万字的阅读挑战英文要完成三十本身的阅读挑战这些阅读挑战需要我们合理的安排我们的完成进度，并且在整个年度内跟踪阅读进展。这与我们现在四年级一本一本书的进展要拉开很大的距离。老师还建议大家在假期就开始训练自己的打字能力和阅读能力。所以还请大家做好心理准备。</p>',
      'TodayNews',
      'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800',
      'Max and ISAAC and Corum',
      '2025-01-15T13:00:00Z',
      true,
      'Books and reading materials related to Reading Challenge Announcement for Grade 5',
      580,
      3
    )
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      "imageAlt" = EXCLUDED."imageAlt",
      "contentLength" = EXCLUDED."contentLength",
      "readingTime" = EXCLUDED."readingTime"
    RETURNING id, title
  `;
  
  const result1 = await client.query(article1Query);
  console.log(`✅ 添加文章: ${result1.rows[0].title} (ID: ${result1.rows[0].id})\n`);
  
  // 检查当前状态
  const statusQuery = `SELECT COUNT(*) as count FROM "Article"`;
  const status = await client.query(statusQuery);
  console.log(`📊 当前数据库文章数量: ${status.rows[0].count}`);
  
} catch (error) {
  console.log('❌ 操作失败:', error.message);
} finally {
  await client.end();
  console.log('\n🔌 连接关闭');
}
