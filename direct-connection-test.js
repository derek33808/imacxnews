import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// 尝试使用直连而不是连接池
const directUrl = process.env.DATABASE_URL.replace('pooler.supabase.com:6543', 'aws-1-ap-southeast-1.compute.amazonaws.com:5432');

console.log('🔍 测试不同连接方式...\n');

async function testConnection(url, name) {
  const client = new pg.Client({
    connectionString: url,
    connectionTimeoutMillis: 10000, // 10秒超时
    query_timeout: 15000, // 15秒查询超时
  });
  
  try {
    console.log(`${name} 连接测试...`);
    await client.connect();
    console.log(`✅ ${name} 连接成功`);
    
    // 快速查询测试
    const result = await client.query('SELECT COUNT(*) FROM "Article"');
    console.log(`📊 ${name} 查询成功 - ${result.rows[0].count} 篇文章`);
    
    return true;
  } catch (error) {
    console.log(`❌ ${name} 失败: ${error.message}`);
    return false;
  } finally {
    try {
      await client.end();
    } catch (e) {
      // 忽略关闭错误
    }
  }
}

// 测试原始连接池
await testConnection(process.env.DATABASE_URL, '连接池');

// 测试直连
await testConnection(directUrl, '直连');

console.log('\n💡 建议: 如果连接池经常超时，可以考虑:');
console.log('   1. 使用直连方式');
console.log('   2. 在Supabase Web界面直接执行SQL');
console.log('   3. 减少单次操作的数据量');
