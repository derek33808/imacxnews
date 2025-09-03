import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  console.log('🔧 测试优化后的数据库连接...\n');
  
  await client.connect();
  console.log('✅ 连接成功！');
  
  // 测试查询
  const count = await client.query('SELECT COUNT(*) FROM "Article"');
  console.log(`📊 查询成功 - 当前有 ${count.rows[0].count} 篇文章`);
  
  // 测试快速INSERT
  console.log('\n🚀 测试INSERT操作...');
  const startTime = Date.now();
  
  const result = await client.query(`
    INSERT INTO "Article" (
      title, slug, excerpt, content, category, image, author, "publishDate", featured,
      "imageAlt", "contentLength", "readingTime"
    ) VALUES (
      'Test Connection Article',
      'test-connection-' || EXTRACT(EPOCH FROM NOW()),
      'Testing optimized connection',
      '<p>This is a test article to verify the optimized database connection works properly.</p>',
      'TodayNews',
      'https://via.placeholder.com/400x200',
      'Connection Test',
      NOW(),
      false,
      'Test image for connection verification',
      50,
      1
    ) RETURNING id, title
  `);
  
  const duration = Date.now() - startTime;
  console.log(`✅ INSERT成功！耗时: ${duration}ms`);
  console.log(`📝 创建文章: ${result.rows[0].title} (ID: ${result.rows[0].id})`);
  
  // 立即删除测试文章
  await client.query('DELETE FROM "Article" WHERE id = $1', [result.rows[0].id]);
  console.log('🗑️ 已删除测试文章');
  
  console.log('\n🎉 优化后的连接工作正常！');
  
} catch (error) {
  console.log('❌ 连接测试失败:', error.message);
  console.log('错误代码:', error.code);
  
  if (error.message.includes('timeout')) {
    console.log('\n💡 仍然超时，建议：');
    console.log('   1. 检查网络连接');
    console.log('   2. 使用Supabase Web界面直接操作');
    console.log('   3. 联系Supabase支持');
  }
} finally {
  await client.end();
  console.log('\n🔌 连接关闭');
}
