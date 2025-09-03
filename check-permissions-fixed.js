import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🔍 检查数据库权限设置...\n');
  
  // 1. 检查RLS状态（修复版本）
  console.log('1️⃣ 检查Row Level Security (RLS)状态:');
  const rlsResult = await client.query(`
    SELECT schemaname, tablename, rowsecurity 
    FROM pg_tables 
    WHERE tablename = 'Article'
  `);
  
  if (rlsResult.rows.length > 0) {
    const table = rlsResult.rows[0];
    console.log(`   表名: ${table.tablename}`);
    console.log(`   RLS启用: ${table.rowsecurity ? '✅ 是 (这可能是问题所在!)' : '❌ 否'}`);
  }
  
  // 2. 检查当前用户
  console.log('\n2️⃣ 检查当前用户:');
  const userResult = await client.query('SELECT current_user, session_user');
  console.log(`   当前用户: ${userResult.rows[0].current_user}`);
  console.log(`   会话用户: ${userResult.rows[0].session_user}`);
  
  // 3. 测试基本查询
  console.log('\n3️⃣ 测试基本查询权限:');
  try {
    const testSelect = await client.query('SELECT COUNT(*) FROM "Article"');
    console.log(`   ✅ SELECT权限正常 - 当前有 ${testSelect.rows[0].count} 篇文章`);
  } catch (error) {
    console.log(`   ❌ SELECT权限异常: ${error.message}`);
  }
  
  // 4. 测试INSERT权限（更简单的测试）
  console.log('\n4️⃣ 测试INSERT权限:');
  try {
    const testInsert = await client.query(`
      INSERT INTO "Article" (title, slug, excerpt, content, category, author, "publishDate") 
      VALUES ('权限测试', 'permission-test-' || EXTRACT(EPOCH FROM NOW()), '测试', '测试内容', 'TodayNews', '测试', NOW()) 
      RETURNING id, title
    `);
    console.log(`   ✅ INSERT权限正常 - 创建了ID: ${testInsert.rows[0].id}`);
    console.log(`   📝 标题: ${testInsert.rows[0].title}`);
    
    // 立即删除测试记录
    const deleteResult = await client.query('DELETE FROM "Article" WHERE id = $1', [testInsert.rows[0].id]);
    console.log(`   🗑️ 已删除测试记录`);
  } catch (error) {
    console.log(`   ❌ INSERT权限异常: ${error.message}`);
    console.log(`   详细: ${error.code} - ${error.detail || '无详细信息'}`);
  }
  
  // 5. 如果RLS启用，检查策略
  if (rlsResult.rows[0]?.rowsecurity) {
    console.log('\n5️⃣ 检查RLS策略:');
    try {
      const policiesResult = await client.query(`
        SELECT policyname, cmd, permissive, roles
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
        console.log('   ❌ 没有找到RLS策略 - 这可能导致所有操作被拒绝！');
      }
    } catch (error) {
      console.log(`   ❌ 检查策略失败: ${error.message}`);
    }
  }
  
  console.log('\n💡 建议:');
  if (rlsResult.rows[0]?.rowsecurity) {
    console.log('   🔓 RLS已启用，可能需要禁用或配置正确的策略');
    console.log('   🛠️ 可以尝试: ALTER TABLE "Article" DISABLE ROW LEVEL SECURITY;');
  } else {
    console.log('   ✅ RLS未启用，权限问题可能在其他地方');
  }
  
} catch (error) {
  console.log('❌ 权限检查失败:', error.message);
} finally {
  await client.end();
  console.log('\n🔌 权限检查完成');
}
