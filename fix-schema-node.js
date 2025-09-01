// 使用原生pg客户端直接执行SQL，避免Prisma的prepared statement问题
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fixSchema() {
  console.log('🔧 使用原生PostgreSQL客户端修复Schema...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ PostgreSQL连接成功');
    
    console.log('📝 检查当前表结构...');
    const checkColumns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Article' AND table_schema = 'public'
      ORDER BY column_name;
    `);
    
    console.log('📊 当前Article表字段:');
    checkColumns.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type}`);
    });
    
    const existingColumns = checkColumns.rows.map(row => row.column_name);
    const requiredColumns = ['imageAlt', 'imageCaption', 'contentLength', 'readingTime'];
    
    // 检查缺失的字段
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ 所有必需字段都已存在');
      return;
    }
    
    console.log(`🔄 需要添加 ${missingColumns.length} 个字段: ${missingColumns.join(', ')}`);
    
    // 添加缺失字段
    const alterStatements = [];
    
    if (missingColumns.includes('imageAlt')) {
      alterStatements.push('ADD COLUMN "imageAlt" TEXT');
    }
    if (missingColumns.includes('imageCaption')) {
      alterStatements.push('ADD COLUMN "imageCaption" TEXT');
    }
    if (missingColumns.includes('contentLength')) {
      alterStatements.push('ADD COLUMN "contentLength" INTEGER');
    }
    if (missingColumns.includes('readingTime')) {
      alterStatements.push('ADD COLUMN "readingTime" INTEGER');
    }
    
    if (alterStatements.length > 0) {
      const alterSQL = `ALTER TABLE "Article" ${alterStatements.join(', ')};`;
      console.log('🔄 执行ALTER TABLE:', alterSQL);
      
      await client.query(alterSQL);
      console.log('✅ 字段添加成功');
    }
    
    // 验证结果
    console.log('\n🔍 验证更新后的表结构...');
    const updatedColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'Article' AND table_schema = 'public'
      ORDER BY column_name;
    `);
    
    console.log('📊 更新后的Article表字段:');
    updatedColumns.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    console.log('\n✅ Schema修复完成！');
    
  } catch (error) {
    console.error('❌ Schema修复失败:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 数据库连接已关闭');
  }
}

fixSchema();
