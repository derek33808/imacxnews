import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🔍 最终检查图片同步状态...\n');
  
  const result = await client.query(`
    SELECT 
      COUNT(*) as total,
      COUNT("imageAlt") as has_alt,
      COUNT("contentLength") as has_length,
      COUNT("readingTime") as has_time
    FROM "Article"
  `);
  
  const stats = result.rows[0];
  console.log('📊 图片数据完整性统计:');
  console.log(`   📱 总文章数: ${stats.total}`);
  console.log(`   🏷️  有Alt文本: ${stats.has_alt} / ${stats.total}`);
  console.log(`   📊 有内容长度: ${stats.has_length} / ${stats.total}`);
  console.log(`   ⏱️  有阅读时间: ${stats.has_time} / ${stats.total}`);
  
  if (stats.has_alt === stats.total) {
    console.log('\n🎉 ✅ 所有文章图片数据同步完成！');
  } else {
    console.log(`\n⚠️ 还有 ${stats.total - stats.has_alt} 篇文章缺少图片数据`);
    
    // 显示缺少数据的文章
    const missing = await client.query(`
      SELECT title, slug FROM "Article" 
      WHERE "imageAlt" IS NULL
    `);
    
    console.log('❌ 缺少图片数据的文章:');
    missing.rows.forEach(row => {
      console.log(`   - ${row.title} (${row.slug})`);
    });
  }
  
} catch (error) {
  console.log('❌ 检查失败:', error.message);
} finally {
  await client.end();
  console.log('\n🔌 检查完成');
}

