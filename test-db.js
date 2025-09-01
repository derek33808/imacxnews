// 数据库连接测试脚本
import { PrismaClient } from '@prisma/client';

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...\n');
  
  const configs = [
    {
      name: '当前配置 (Pooler)',
      url: process.env.DATABASE_URL
    },
    {
      name: '直连模式',
      url: "postgresql://postgres:dshome86611511@db.ihkdquydhciabhrwffkb.supabase.co:5432/postgres?sslmode=require"
    },
    {
      name: '无SSL直连',
      url: "postgresql://postgres:dshome86611511@db.ihkdquydhciabhrwffkb.supabase.co:5432/postgres"
    }
  ];
  
  for (const config of configs) {
    console.log(`📡 测试: ${config.name}`);
    console.log(`URL: ${config.url}\n`);
    
    try {
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: config.url
          }
        }
      });
      
      await prisma.$connect();
      console.log('✅ 连接成功!\n');
      
      // 尝试查询
      const result = await prisma.$queryRaw`SELECT version();`;
      console.log('📊 数据库版本:', result[0].version);
      
      await prisma.$disconnect();
      console.log('✅ 测试完成\n');
      break; // 如果成功就停止测试其他配置
      
    } catch (error) {
      console.log('❌ 连接失败:', error.message);
      console.log('---\n');
    }
  }
}

testDatabaseConnection().catch(console.error);
