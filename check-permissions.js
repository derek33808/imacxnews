import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🔍 检查数据库权限设置...\n');
  
  // 1. 检查RLS状态
  console.log('1️⃣ 检查Row Level Security (RLS)状态:');
  const rlsResult = await client.query(`
    SELECT schemaname, tablename, rowsecurity, hasoids 
    FROM pg_tables 
    WHERE tablename = 'Article'
  `);
  
  if (rlsResult.rows.length > 0) {
    const table = rlsResult.rows[0];
    console.log(`   表名: ${table.tablename}`);
    console.log(`   RLS启用: ${table.rowsecurity ? '✅ 是' : '❌ 否'}`);
  }
  
  // 2. 检查RLS策略
  console.log('\n2️⃣ 检查RLS策略:');
  const policiesResult = await client.query(`
    SELECT policyname, cmd, permissive, roles, qual, with_check
    FROM pg_policies 
    WHERE tablename = 'Article'
  `);
  
  if (policiesResult.rows.length > 0) {
    console.log('   发现以下策略:');
    policiesResult.rows.forEach(policy => {
      console.log(`   - 策略名: ${policy.policyname}`);
      console.log(`     命令: ${policy.cmd}`);
      console.log(`     角色: ${policy.roles}`);
    });
  } else {
    console.log('   ❌ 没有找到RLS策略');
  }
  
  // 3. 检查当前用户权限
  console.log('\n3️⃣ 检查当前用户权限:');
  const userResult = await client.query('SELECT current_user, session_user');
  console.log(`   当前用户: ${userResult.rows[0].current_user}`);
  console.log(`   会话用户: ${userResult.rows[0].session_user}`);
  
  // 4. 检查表权限
  console.log('\n4️⃣ 检查表权限:');
  const tablePrivs = await client.query(`
    SELECT grantee, privilege_type, is_grantable
    FROM information_schema.role_table_grants 
    WHERE table_name = 'Article'
  `);
  
  if (tablePrivs.rows.length > 0) {
    console.log('   表权限:');
    tablePrivs.rows.forEach(priv => {
      console.log(`   - 用户: ${priv.grantee}, 权限: ${priv.privilege_type}`);
    });
  }
  
  // 5. 尝试简单查询测试
  console.log('\n5️⃣ 测试基本查询权限:');
  try {
    const testSelect = await client.query('SELECT COUNT(*) FROM "Article"');
    console.log(`   ✅ SELECT权限正常 - 当前有 ${testSelect.rows[0].count} 篇文章`);
  } catch (error) {
    console.log(`   ❌ SELECT权限异常: ${error.message}`);
  }
  
  // 6. 测试INSERT权限
  console.log('\n6️⃣ 测试INSERT权限:');
  try {
    const testInsert = await client.query(`
      INSERT INTO "Article" (title, slug, excerpt, content, category, author, "publishDate") 
      VALUES ('权限测试', 'permission-test', '测试', '测试内容', 'TodayNews', '测试', NOW()) 
      RETURNING id
    `);
    console.log(`   ✅ INSERT权限正常 - 创建了ID: ${testInsert.rows[0].id}`);
    
    // 立即删除测试记录
    await client.query('DELETE FROM "Article" WHERE id = $1', [testInsert.rows[0].id]);
    console.log(`   🗑️ 已删除测试记录`);
  } catch (error) {
    console.log(`   ❌ INSERT权限异常: ${error.message}`);
  }
  
} catch (error) {
  console.log('❌ 权限检查失败:', error.message);
  console.log('详细错误信息:', error);
} finally {
  await client.end();
  console.log('\n🔌 权限检查完成');
}
