import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🔍 检查当前数据库状态...\n');
  
  const result = await client.query(`
    SELECT 
      id,
      title,
      slug,
      category,
      "publishDate",
      featured,
      "imageAlt",
      "contentLength",
      "readingTime",
      CASE 
        WHEN image LIKE 'http%' THEN '外部图片'
        ELSE '本地图片'
      END as image_type
    FROM "Article" 
    ORDER BY id
  `);
  
  console.log(`📊 数据库中当前有 ${result.rows.length} 篇文章：`);
  console.log('=' .repeat(80));
  
  result.rows.forEach((row, index) => {
    console.log(`${index + 1}. ID: ${row.id}`);
    console.log(`   标题: ${row.title}`);
    console.log(`   Slug: ${row.slug}`);
    console.log(`   分类: ${row.category}`);
    console.log(`   发布日期: ${row.publishDate}`);
    console.log(`   推荐: ${row.featured ? '是' : '否'}`);
    console.log(`   图片类型: ${row.image_type}`);
    console.log(`   图片Alt: ${row.imageAlt ? '✅' : '❌'}`);
    console.log(`   内容长度: ${row.contentLength || '❌'}`);
    console.log(`   阅读时间: ${row.readingTime || '❌'}`);
    console.log('   ' + '-'.repeat(40));
  });
  
  console.log('\n🔍 前端 initialArticlesData 中的文章：');
  console.log('=' .repeat(80));
  
  const frontendArticles = [
    { id: 1, title: "Reading Challenge Announcement for Grade 5", slug: "reading-challenge-announcement" },
    { id: 2, title: "Dali Trip Preparation Updates", slug: "dali-trip-updates" },
    { id: 3, title: "IMACX News Website Development with AI", slug: "imacx-news-ai-website" },
    { id: 4, title: "Folk Music Experience Project at The World School", slug: "folk-music-project" },
    { id: 5, title: "Military News: China's J-15A Fighter Jet Performance", slug: "china-j15a-fighter-performance" }
  ];
  
  frontendArticles.forEach((article, index) => {
    const inDatabase = result.rows.find(row => row.slug === article.slug);
    console.log(`${index + 1}. ${article.title} (${article.slug})`);
    console.log(`   数据库状态: ${inDatabase ? '✅ 存在 (ID: ' + inDatabase.id + ')' : '❌ 缺失'}`);
  });
  
  console.log('\n📈 总结：');
  console.log(`   前端文章数量: ${frontendArticles.length}`);
  console.log(`   数据库文章数量: ${result.rows.length}`);
  console.log(`   需要同步的文章: ${frontendArticles.filter(fa => !result.rows.find(row => row.slug === fa.slug)).length}`);
  console.log(`   数据库多余的文章: ${result.rows.filter(row => !frontendArticles.find(fa => fa.slug === row.slug)).length}`);
  
} catch (error) {
  console.log('❌ 检查失败:', error.message);
} finally {
  await client.end();
}
