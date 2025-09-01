// 深度测试两种主要连接模式的稳定性
import { PrismaClient } from '@prisma/client';

// 测试配置
const TEST_CONFIG = {
  rounds: 3, // 测试轮数
  testsPerRound: 10, // 每轮测试次数
  delayBetweenTests: 500, // 测试间隔（毫秒）
  delayBetweenRounds: 2000 // 轮次间隔（毫秒）
};

const connectionModes = [
  {
    name: '直连模式（优化版）',
    url: "postgresql://postgres:dshome86611511@db.ihkdquydhciabhrwffkb.supabase.co:5432/postgres?sslmode=require&connect_timeout=30&command_timeout=60&pool_timeout=30"
  },
  {
    name: '直连模式（基础版）',
    url: "postgresql://postgres:dshome86611511@db.ihkdquydhciabhrwffkb.supabase.co:5432/postgres?sslmode=require"
  }
];

async function performTest(config, testNumber) {
  const startTime = Date.now();
  try {
    const prisma = new PrismaClient({
      datasources: { db: { url: config.url } }
    });
    
    await prisma.$connect();
    
    // 执行简单查询
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    await prisma.$disconnect();
    
    const duration = Date.now() - startTime;
    return { success: true, duration, error: null };
  } catch (error) {
    const duration = Date.now() - startTime;
    return { 
      success: false, 
      duration, 
      error: error.message.split('\n')[0] 
    };
  }
}

async function testConnectionMode(config) {
  console.log(`\n🔍 测试连接模式: ${config.name}`);
  console.log(`📡 URL: ${config.url}\n`);
  
  const overallStats = {
    totalTests: 0,
    successCount: 0,
    failureCount: 0,
    totalDuration: 0,
    errors: {},
    roundResults: []
  };
  
  for (let round = 1; round <= TEST_CONFIG.rounds; round++) {
    console.log(`📋 第 ${round}/${TEST_CONFIG.rounds} 轮测试:`);
    
    const roundStats = {
      success: 0,
      failed: 0,
      durations: [],
      errors: []
    };
    
    for (let test = 1; test <= TEST_CONFIG.testsPerRound; test++) {
      const result = await performTest(config, test);
      
      overallStats.totalTests++;
      roundStats.durations.push(result.duration);
      
      if (result.success) {
        overallStats.successCount++;
        roundStats.success++;
        process.stdout.write('✅');
      } else {
        overallStats.failureCount++;
        roundStats.failed++;
        roundStats.errors.push(result.error);
        
        // 统计错误类型
        const errorKey = result.error || 'Unknown';
        overallStats.errors[errorKey] = (overallStats.errors[errorKey] || 0) + 1;
        
        process.stdout.write('❌');
      }
      
      if (test < TEST_CONFIG.testsPerRound) {
        await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.delayBetweenTests));
      }
    }
    
    const avgDuration = roundStats.durations.reduce((a, b) => a + b, 0) / roundStats.durations.length;
    const successRate = (roundStats.success / TEST_CONFIG.testsPerRound * 100).toFixed(1);
    
    console.log(`\n   成功: ${roundStats.success}/${TEST_CONFIG.testsPerRound} (${successRate}%) | 平均耗时: ${avgDuration.toFixed(0)}ms`);
    
    overallStats.roundResults.push({
      round,
      successRate: parseFloat(successRate),
      avgDuration: avgDuration
    });
    
    if (round < TEST_CONFIG.rounds) {
      console.log(`   等待 ${TEST_CONFIG.delayBetweenRounds}ms 后进行下一轮...\n`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.delayBetweenRounds));
    }
  }
  
  // 计算总体统计
  const overallSuccessRate = (overallStats.successCount / overallStats.totalTests * 100).toFixed(1);
  const avgDuration = overallStats.totalDuration / overallStats.totalTests;
  
  console.log(`\n📊 总体结果:`);
  console.log(`   总成功率: ${overallSuccessRate}% (${overallStats.successCount}/${overallStats.totalTests})`);
  console.log(`   失败次数: ${overallStats.failureCount}`);
  
  if (Object.keys(overallStats.errors).length > 0) {
    console.log(`   主要错误:`);
    Object.entries(overallStats.errors).forEach(([error, count]) => {
      console.log(`     - ${error}: ${count} 次`);
    });
  }
  
  // 各轮稳定性分析
  const successRates = overallStats.roundResults.map(r => r.successRate);
  const stabilityScore = 100 - (Math.max(...successRates) - Math.min(...successRates));
  console.log(`   稳定性评分: ${stabilityScore.toFixed(1)}% (波动越小越好)`);
  
  return {
    name: config.name,
    url: config.url,
    overallSuccessRate: parseFloat(overallSuccessRate),
    stabilityScore,
    errorCount: overallStats.failureCount,
    errors: overallStats.errors,
    roundResults: overallStats.roundResults
  };
}

async function compareConnectionModes() {
  console.log('🚀 开始深度连接稳定性测试...');
  console.log(`📋 测试配置: ${TEST_CONFIG.rounds} 轮 × ${TEST_CONFIG.testsPerRound} 次 = ${TEST_CONFIG.rounds * TEST_CONFIG.testsPerRound} 次总测试\n`);
  
  const results = [];
  
  for (const [index, config] of connectionModes.entries()) {
    const result = await testConnectionMode(config);
    results.push(result);
    
    if (index < connectionModes.length - 1) {
      console.log(`\n⏱️  等待 ${TEST_CONFIG.delayBetweenRounds * 2}ms 后测试下一个模式...\n`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.delayBetweenRounds * 2));
    }
  }
  
  // 对比分析
  console.log('\n' + '='.repeat(80));
  console.log('📊 连接模式对比分析');
  console.log('='.repeat(80));
  
  results.sort((a, b) => {
    // 首先按成功率排序，然后按稳定性评分排序
    if (Math.abs(a.overallSuccessRate - b.overallSuccessRate) < 5) {
      return b.stabilityScore - a.stabilityScore;
    }
    return b.overallSuccessRate - a.overallSuccessRate;
  });
  
  results.forEach((result, index) => {
    const rank = index + 1;
    const status = result.overallSuccessRate >= 90 ? '🟢 优秀' : 
                  result.overallSuccessRate >= 80 ? '🟡 良好' : 
                  result.overallSuccessRate >= 60 ? '🟠 一般' : '🔴 较差';
    
    console.log(`\n${rank}. ${result.name}`);
    console.log(`   ${status} | 成功率: ${result.overallSuccessRate}% | 稳定性: ${result.stabilityScore.toFixed(1)}%`);
    console.log(`   失败次数: ${result.errorCount}`);
  });
  
  const best = results[0];
  console.log(`\n🏆 推荐配置: ${best.name}`);
  console.log(`✅ 成功率: ${best.overallSuccessRate}%`);
  console.log(`📈 稳定性评分: ${best.stabilityScore.toFixed(1)}%`);
  console.log(`\n🔧 建议的 DATABASE_URL:`);
  console.log(best.url);
  
  if (best.overallSuccessRate < 90) {
    console.log(`\n⚠️  警告: 最佳配置的成功率仍低于90%，建议检查网络环境或考虑其他解决方案。`);
  }
}

compareConnectionModes().catch(console.error);
