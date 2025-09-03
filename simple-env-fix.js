import { writeFileSync } from 'fs';

console.log('🔧 使用最简单的连接配置...\n');

// 最简单的连接字符串
const simpleUrl = 'postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres';

console.log('🚀 简化的连接字符串:');
console.log(`DATABASE_URL="${simpleUrl}"`);

// 写入简化的配置
writeFileSync('.env', `DATABASE_URL="${simpleUrl}"\n`);
console.log('\n✅ 已更新为最简化的 .env 配置');
console.log('💡 移除了所有额外参数，回到最基本的连接');
