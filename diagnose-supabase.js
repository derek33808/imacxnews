import { createClient } from '@supabase/supabase-js';

// 从环境变量或默认值获取配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://ihkdquydhciabhrwffkb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'imacx-media';

async function diagnoseSupabase() {
  console.log('🔍 Supabase 存储诊断工具\n');
  
  // 1. 检查环境变量
  console.log('1️⃣ 检查环境变量:');
  console.log(`   - SUPABASE_URL: ${supabaseUrl}`);
  console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ 已设置' : '❌ 未设置'}`);
  console.log(`   - STORAGE_BUCKET: ${STORAGE_BUCKET}\n`);
  
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY 环境变量未设置');
    return;
  }
  
  // 创建 Supabase 客户端
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // 2. 测试连接
    console.log('2️⃣ 测试 Supabase 连接...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ 无法连接到 Supabase Storage:', listError.message);
      return;
    }
    
    console.log('✅ Supabase 连接成功');
    console.log(`   - 找到 ${buckets.length} 个存储桶\n`);
    
    // 3. 检查存储桶
    console.log('3️⃣ 检查存储桶:');
    const targetBucket = buckets.find(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!targetBucket) {
      console.error(`❌ 存储桶 "${STORAGE_BUCKET}" 不存在`);
      console.log('📋 现有存储桶:');
      buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (public: ${bucket.public})`);
      });
      
      // 尝试创建存储桶
      console.log(`\n🔧 尝试创建存储桶 "${STORAGE_BUCKET}"...`);
      const { data: createData, error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/*', 'video/*']
      });
      
      if (createError) {
        console.error('❌ 创建存储桶失败:', createError.message);
        return;
      } else {
        console.log('✅ 存储桶创建成功');
      }
    } else {
      console.log(`✅ 存储桶 "${STORAGE_BUCKET}" 存在`);
      console.log(`   - Public: ${targetBucket.public}`);
      console.log(`   - Created: ${targetBucket.created_at}\n`);
    }
    
    // 4. 测试文件夹结构
    console.log('4️⃣ 检查文件夹结构:');
    const testFolders = ['images/today-news', 'images/past-news', 'videos/today-news', 'videos/past-news'];
    
    for (const folder of testFolders) {
      const { data: files, error: listFilesError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .list(folder, { limit: 1 });
      
      if (listFilesError) {
        console.log(`   - ${folder}: ❌ ${listFilesError.message}`);
      } else {
        console.log(`   - ${folder}: ✅ 可访问 (${files.length} 个文件)`);
      }
    }
    
    // 5. 测试上传权限
    console.log('\n5️⃣ 测试上传权限:');
    const testFileName = `test-upload-${Date.now()}.txt`;
    const testContent = 'This is a test file for upload permissions.';
    const testPath = `images/today-news/${testFileName}`;
    
    // 创建测试文件 blob
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(testPath, testBlob, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error(`❌ 测试上传失败: ${uploadError.message}`);
      console.log(`   - 错误代码: ${uploadError.status || 'N/A'}`);
      console.log(`   - 详细信息: ${JSON.stringify(uploadError, null, 2)}`);
    } else {
      console.log('✅ 测试上传成功');
      console.log(`   - 路径: ${uploadData.path}`);
      
      // 获取公共URL
      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(testPath);
      console.log(`   - 公共URL: ${publicUrl}`);
      
      // 清理测试文件
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([testPath]);
      
      if (deleteError) {
        console.warn(`⚠️ 清理测试文件失败: ${deleteError.message}`);
      } else {
        console.log('✅ 测试文件已清理');
      }
    }
    
    // 6. 存储桶策略检查
    console.log('\n6️⃣ 存储桶策略建议:');
    console.log('   如果上传失败，请确保在 Supabase Dashboard 中设置了正确的 RLS 策略：');
    console.log('   1. 进入 Storage -> Policies');
    console.log('   2. 为 imacx-media 桶创建策略');
    console.log('   3. 允许 service_role 进行 INSERT, SELECT, DELETE 操作');
    
  } catch (error) {
    console.error('❌ 诊断过程中出现错误:', error.message);
  }
}

diagnoseSupabase();
