import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🔍 检查并清理数据库...\n');
  
  // 查看当前所有文章
  const current = await client.query('SELECT id, title, slug FROM "Article" ORDER BY id');
  console.log('当前文章:');
  current.rows.forEach(row => {
    console.log(`  ${row.id}: ${row.title} (${row.slug})`);
  });
  
  // 删除测试文章
  console.log('\n删除测试文章...');
  await client.query('DELETE FROM "Article" WHERE title IN ($1, $2, $3)', [
    'Hello A2 Updated',
    'Test Online', 
    'aaaaa'
  ]);
  
  // 查看删除后的结果
  const after = await client.query('SELECT id, title, slug FROM "Article" ORDER BY id');
  console.log('\n删除后剩余文章:');
  after.rows.forEach(row => {
    console.log(`  ${row.id}: ${row.title} (${row.slug})`);
  });
  
  console.log(`\n✅ 完成！剩余 ${after.rows.length} 篇文章`);
  
} catch (error) {
  console.log('❌ 操作失败:', error.message);
} finally {
  await client.end();
}
