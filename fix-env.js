import { writeFileSync, readFileSync } from 'fs';

console.log('🔧 修复 .env 配置...\n');

// 读取当前配置
const currentEnv = readFileSync('.env', 'utf8');
console.log('当前配置:');
console.log(currentEnv);

// 提供几种连接选项
const options = {
  pooler: 'postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  direct: 'postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.compute.amazonaws.com:5432/postgres',
  session: 'postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1',
};

console.log('\n📋 可用的连接选项:');
console.log('1. 连接池 (当前) - 高并发但可能超时');
console.log('2. 直连 - 更稳定但可能被限制');
console.log('3. 会话模式 - 连接池的会话模式');

console.log('\n💡 建议尝试的修复:');
console.log('1. 添加连接超时参数');
console.log('2. 使用会话模式连接');
console.log('3. 添加SSL参数');

// 创建优化的连接字符串
const optimizedUrl = `${options.pooler}?sslmode=require&connect_timeout=30&statement_timeout=60000&idle_in_transaction_session_timeout=300000`;

console.log('\n🚀 优化后的连接字符串:');
console.log(`DATABASE_URL="${optimizedUrl}"`);

// 写入优化的配置
writeFileSync('.env.optimized', `DATABASE_URL="${optimizedUrl}"\n`);
console.log('\n✅ 已创建 .env.optimized 文件');
console.log('💡 您可以重命名为 .env 来使用优化配置');
