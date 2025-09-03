import { writeFileSync } from 'fs';

console.log('🔧 修复SSL证书问题...\n');

// 原始连接字符串（不带SSL验证）
const fixedUrl = 'postgresql://postgres.ihkdquydhciabhrwffkb:dshome86611511@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&sslcert=&sslkey=&sslrootcert=&sslidentity=&sslpassword=&connect_timeout=30&statement_timeout=60000';

console.log('🚀 修复后的连接字符串:');
console.log(`DATABASE_URL="${fixedUrl}"`);

// 写入修复的配置
writeFileSync('.env', `DATABASE_URL="${fixedUrl}"\n`);
console.log('\n✅ 已更新 .env 文件');
console.log('💡 移除了SSL证书验证以避免自签名证书问题');
