// Local test script to verify Supabase Storage configuration
// This simulates the Netlify environment check

import { createClient } from '@supabase/supabase-js';

// Configuration check function
async function testNetlifyStorageConfig() {
  console.log('🔍 测试 Netlify 存储环境变量配置');
  console.log('=' .repeat(50));
  
  const config = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    MAX_IMAGE_SIZE: process.env.MAX_IMAGE_SIZE || '10485760',
    MAX_VIDEO_SIZE: process.env.MAX_VIDEO_SIZE || '52428800',
    ENABLE_VIDEO_NEWS: process.env.ENABLE_VIDEO_NEWS || 'true'
  };
  
  let score = 0;
  const maxScore = 5;
  const issues = [];
  const recommendations = [];
  
  console.log('\n1️⃣ 环境变量检查:');
  console.log('-' .repeat(30));
  
  // Check required variables
  if (config.SUPABASE_URL) {
    console.log(`✅ SUPABASE_URL: ${config.SUPABASE_URL}`);
    score++;
  } else {
    console.log('❌ SUPABASE_URL: 未设置');
    issues.push('SUPABASE_URL 未配置');
    recommendations.push('在 Netlify 环境变量中设置 SUPABASE_URL');
  }
  
  if (config.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${config.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...`);
    score++;
  } else {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY: 未设置');
    issues.push('SUPABASE_SERVICE_ROLE_KEY 未配置');
    recommendations.push('在 Netlify 环境变量中设置 SUPABASE_SERVICE_ROLE_KEY');
  }
  
  console.log(`ℹ️  MAX_IMAGE_SIZE: ${config.MAX_IMAGE_SIZE} (${(parseInt(config.MAX_IMAGE_SIZE) / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`ℹ️  MAX_VIDEO_SIZE: ${config.MAX_VIDEO_SIZE} (${(parseInt(config.MAX_VIDEO_SIZE) / 1024 / 1024).toFixed(1)}MB)`);
  console.log(`ℹ️  ENABLE_VIDEO_NEWS: ${config.ENABLE_VIDEO_NEWS}`);
  
  // If basic config is missing, can't proceed
  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n❌ 基本配置缺失，无法测试 Supabase 连接');
    showSummary(score, maxScore, issues, recommendations);
    return;
  }
  
  // Test Supabase connection
  console.log('\n2️⃣ Supabase 连接测试:');
  console.log('-' .repeat(30));
  
  try {
    const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // List buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log(`❌ 连接失败: ${listError.message}`);
      issues.push(`Supabase 连接失败: ${listError.message}`);
      recommendations.push('检查 SUPABASE_SERVICE_ROLE_KEY 是否正确');
    } else {
      console.log(`✅ 连接成功，找到 ${buckets.length} 个存储桶`);
      score++;
      
      // List all buckets
      if (buckets.length > 0) {
        console.log('   存储桶列表:');
        buckets.forEach(bucket => {
          console.log(`   - ${bucket.name} (public: ${bucket.public})`);
        });
      }
      
      // Check target bucket
      console.log('\n3️⃣ 目标存储桶检查:');
      console.log('-' .repeat(30));
      
      const targetBucket = buckets.find(b => b.name === 'imacx-media');
      if (targetBucket) {
        console.log(`✅ 找到 "imacx-media" 存储桶`);
        console.log(`   - Public: ${targetBucket.public}`);
        console.log(`   - Created: ${targetBucket.created_at}`);
        score++;
      } else {
        console.log('❌ 未找到 "imacx-media" 存储桶');
        issues.push('imacx-media 存储桶不存在');
        recommendations.push('在 Supabase Dashboard 中创建 imacx-media 存储桶');
        recommendations.push('或运行 node setup-supabase-storage.js 自动创建');
      }
      
      // Test upload (only if bucket exists)
      if (targetBucket) {
        console.log('\n4️⃣ 上传权限测试:');
        console.log('-' .repeat(30));
        
        const testPath = `test/config-check-${Date.now()}.txt`;
        const testContent = 'Netlify configuration test';
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('imacx-media')
          .upload(testPath, new Blob([testContent], { type: 'text/plain' }), {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.log(`❌ 上传测试失败: ${uploadError.message}`);
          issues.push(`上传权限错误: ${uploadError.message}`);
          
          if (uploadError.message.includes('policy')) {
            recommendations.push('在 Supabase Storage 中设置正确的 RLS 策略');
            recommendations.push('确保 service_role 有完整的存储桶访问权限');
          }
        } else {
          console.log('✅ 上传测试成功');
          console.log(`   - 文件路径: ${uploadData.path}`);
          score++;
          
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('imacx-media')
            .getPublicUrl(testPath);
          console.log(`   - 公共URL: ${publicUrl}`);
          
          // Clean up
          const { error: deleteError } = await supabase.storage
            .from('imacx-media')
            .remove([testPath]);
          
          if (deleteError) {
            console.log(`⚠️  清理测试文件失败: ${deleteError.message}`);
          } else {
            console.log('✅ 测试文件已清理');
          }
        }
      }
    }
    
  } catch (error) {
    console.log(`❌ Supabase 测试失败: ${error.message}`);
    issues.push(`Supabase 测试异常: ${error.message}`);
    recommendations.push('检查网络连接和 Supabase 服务状态');
  }
  
  showSummary(score, maxScore, issues, recommendations);
}

function showSummary(score, maxScore, issues, recommendations) {
  console.log('\n' + '=' .repeat(50));
  console.log('📊 配置检查总结');
  console.log('=' .repeat(50));
  
  const percentage = Math.round((score / maxScore) * 100);
  const status = score === maxScore ? '✅ 完全就绪' : 
                 score >= 3 ? '⚠️  基本可用' : '❌ 需要修复';
  
  console.log(`状态: ${status}`);
  console.log(`得分: ${score}/${maxScore} (${percentage}%)`);
  
  if (issues.length > 0) {
    console.log('\n🚨 发现的问题:');
    issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  if (recommendations.length > 0) {
    console.log('\n💡 建议操作:');
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
  
  if (score === maxScore) {
    console.log('\n🎉 恭喜！您的 Supabase 存储配置已完全就绪！');
  } else {
    console.log('\n🔧 请按照建议操作完成配置，然后重新运行此脚本验证。');
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log('💻 在线检查: https://your-netlify-site.netlify.app/admin/storage-check');
  console.log('📖 详细文档: 查看 SUPABASE_STORAGE_SETUP.md');
  console.log('=' .repeat(50));
}

// Run the test
console.log('🚀 启动 Netlify 存储配置测试...\n');

if (!process.env.SUPABASE_URL && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('💡 提示: 请先设置环境变量或创建 .env 文件:');
  console.log('');
  console.log('export SUPABASE_URL="https://your-project-ref.supabase.co"');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.log('');
  console.log('或创建 .env 文件包含上述变量，然后运行:');
  console.log('node -r dotenv/config test-netlify-storage.js');
  console.log('');
}

testNetlifyStorageConfig().catch(error => {
  console.error('❌ 测试脚本执行失败:', error.message);
  process.exit(1);
});
