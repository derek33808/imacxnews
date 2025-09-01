// 测试优化后的连接配置
import { PrismaClient } from '@prisma/client';

const connectionConfigs = [
  {
    name: '当前Pooler配置',
    url: "postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
  },
  {
    name: 'Pooler+优化参数',
    url: "postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=20&connect_timeout=10"
  },
  {
    name: 'Pooler+Session模式',
    url: "postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=3"
  },
  {
    name: '直连+超时优化',
    url: "postgresql://postgres:dshome86611511@db.ihkdquydhciabhrwffkb.supabase.co:5432/postgres?sslmode=require&connect_timeout=15&command_timeout=30"
  },
  {
    name: '直连+连接池',
    url: "postgresql://postgres:dshome86611511@db.ihkdquydhciabhrwffkb.supabase.co:5432/postgres?sslmode=require&connection_limit=3&pool_timeout=10"
  }
];

async function quickTest(config, attempts = 5) {
  console.log(`🔍 测试: ${config.name}`);
  let successCount = 0;
  const errors = [];
  const durations = [];
  
  for (let i = 1; i <= attempts; i++) {
    const startTime = Date.now();
    try {
      const prisma = new PrismaClient({
        datasources: { db: { url: config.url } }
      });
      
      await prisma.$connect();
      
      // 测试查询
      await prisma.$queryRaw`SELECT 1 as test`;
      
      // 测试文章查询（如果存在）
      try {
        const count = await prisma.article.count();
        console.log(`  📊 文章数量: ${count}`);
      } catch (e) {
        // 表可能不存在，忽略
      }
      
      await prisma.$disconnect();
      
      const duration = Date.now() - startTime;
      durations.push(duration);
      successCount++;
      
      process.stdout.write(`✅`);
    } catch (error) {
      const duration = Date.now() - startTime;
      durations.push(duration);
      errors.push(error.message.split('\n')[0]);
      process.stdout.write(`❌`);
    }
    
    if (i < attempts) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
  
  const successRate = (successCount / attempts * 100).toFixed(1);
  const avgDuration = durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(0) : 0;
  
  console.log(`\n  📊 结果: ${successCount}/${attempts} 成功 (${successRate}%) | 平均耗时: ${avgDuration}ms`);
  
  if (errors.length > 0) {
    const uniqueErrors = [...new Set(errors)];
    console.log(`  ❌ 错误: ${uniqueErrors.join(', ')}`);
  }
  
  return {
    name: config.name,
    url: config.url,
    successRate: parseFloat(successRate),
    avgDuration: parseInt(avgDuration),
    errorCount: errors.length,
    errors: errors
  };
}

async function findBestConfiguration() {
  console.log('🚀 开始测试优化连接配置...\n');
  
  const results = [];
  
  for (const [index, config] of connectionConfigs.entries()) {
    const result = await quickTest(config);
    results.push(result);
    
    if (index < connectionConfigs.length - 1) {
      console.log('\n⏱️  等待2秒后测试下一个配置...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // 排序结果
  results.sort((a, b) => {
    // 优先考虑成功率，其次考虑速度
    if (Math.abs(a.successRate - b.successRate) < 10) {
      return a.avgDuration - b.avgDuration;
    }
    return b.successRate - a.successRate;
  });
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 连接配置测试结果排名');
  console.log('='.repeat(70));
  
  results.forEach((result, index) => {
    const rank = index + 1;
    const status = result.successRate === 100 ? '🟢 完美' :
                  result.successRate >= 80 ? '🟡 良好' :
                  result.successRate >= 60 ? '🟠 一般' : '🔴 较差';
    
    console.log(`\n${rank}. ${result.name}`);
    console.log(`   ${status} | 成功率: ${result.successRate}% | 平均耗时: ${result.avgDuration}ms`);
    if (result.errorCount > 0) {
      console.log(`   错误数: ${result.errorCount}`);
    }
  });
  
  const winner = results[0];
  console.log(`\n🏆 推荐配置: ${winner.name}`);
  console.log(`✅ 成功率: ${winner.successRate}%`);
  console.log(`⚡ 平均响应时间: ${winner.avgDuration}ms`);
  
  console.log(`\n🔧 建议使用的 DATABASE_URL:`);
  console.log(winner.url);
  
  // 提供配置建议
  if (winner.successRate === 100) {
    console.log('\n🎉 找到完美配置！建议立即应用。');
  } else if (winner.successRate >= 80) {
    console.log('\n✅ 找到良好配置，建议应用并监控稳定性。');
  } else {
    console.log('\n⚠️  所有配置稳定性都不理想，建议：');
    console.log('   1. 检查网络连接稳定性');
    console.log('   2. 考虑启用智能备用模式');
    console.log('   3. 联系 Supabase 技术支持');
  }
  
  return winner;
}

// 运行测试
findBestConfiguration()
  .then(winner => {
    console.log('\n🔄 正在应用最佳配置...');
    
    // 生成优化后的 .env 内容
    const envContent = `# 🎯 优化后的数据库配置 (测试成功率: ${winner.successRate}%)
DATABASE_URL="${winner.url}"

JWT_SECRET="7Y6XGUNkO8sAto4d/gBTsQmdc4um666TS7P7zJ1jnEEZ50gocclbXg3BICw2NFgC2wej0nJWXxNQFC3xEe09FQ=="
PUBLIC_API_BASE="http://127.0.0.1:4321"
PUBLIC_SECURE_COOKIES="false"
PUBLIC_DEV_NOAUTH="true"

# 智能备用模式 (当数据库不可用时自动切换到静态数据)
ENABLE_SMART_FALLBACK="true"`;
    
    console.log('\n📝 建议的 .env 配置:');
    console.log('='.repeat(50));
    console.log(envContent);
    console.log('='.repeat(50));
  })
  .catch(console.error);
