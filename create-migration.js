// 创建新的数据库迁移并应用
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function createAndApplyMigration() {
  try {
    console.log('🔄 第一步：生成Prisma客户端...');
    const { stdout: generateOutput } = await execAsync('npx prisma generate');
    console.log('✅ Prisma客户端生成完成');
    
    console.log('\n🔄 第二步：创建数据库迁移...');
    const { stdout: migrateOutput } = await execAsync('npx prisma migrate dev --name add_image_and_content_fields --create-only');
    console.log('✅ 迁移文件创建完成');
    console.log(migrateOutput);
    
    console.log('\n🔄 第三步：应用数据库迁移...');
    const { stdout: deployOutput } = await execAsync('npx prisma migrate deploy');
    console.log('✅ 迁移应用完成');
    console.log(deployOutput);
    
    console.log('\n🎉 数据库schema更新完成！');
    console.log('现在可以运行图片同步脚本了。');
    
  } catch (error) {
    console.error('❌ 迁移过程失败:', error.message);
    console.error('详细错误:', error);
    
    // 如果迁移失败，尝试推送schema
    console.log('\n🔧 尝试推送schema到数据库...');
    try {
      const { stdout: pushOutput } = await execAsync('npx prisma db push');
      console.log('✅ Schema推送成功');
      console.log(pushOutput);
    } catch (pushError) {
      console.error('❌ Schema推送也失败:', pushError.message);
    }
  }
}

createAndApplyMigration();
