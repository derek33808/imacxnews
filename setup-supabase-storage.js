import { createClient } from '@supabase/supabase-js';

// 从环境变量获取配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://ihkdquydhciabhrwffkb.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = 'imacx-media';

async function setupSupabaseStorage() {
  console.log('🚀 Supabase 存储设置工具\n');
  
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY 环境变量未设置');
    console.log('\n💡 解决方案：');
    console.log('1. 前往 Supabase Project Dashboard');
    console.log('2. 进入 Settings > API');
    console.log('3. 复制 "service_role" 密钥');
    console.log('4. 在 Netlify 中设置环境变量 SUPABASE_SERVICE_ROLE_KEY');
    console.log('   或创建本地 .env 文件：');
    console.log('   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    console.log('1️⃣ 检查存储桶状态...');
    
    // 检查存储桶是否存在
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ 无法访问 Supabase Storage:', listError.message);
      return;
    }

    const existingBucket = buckets.find(bucket => bucket.name === STORAGE_BUCKET);
    
    if (existingBucket) {
      console.log(`✅ 存储桶 "${STORAGE_BUCKET}" 已存在`);
      console.log(`   - Public: ${existingBucket.public}`);
    } else {
      console.log(`❌ 存储桶 "${STORAGE_BUCKET}" 不存在，正在创建...`);
      
      // 创建存储桶
      const { data: createData, error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        allowedMimeTypes: ['image/*', 'video/*'],
        fileSizeLimit: 52428800 // 50MB
      });
      
      if (createError) {
        console.error('❌ 创建存储桶失败:', createError.message);
        return;
      }
      
      console.log('✅ 存储桶创建成功');
    }

    console.log('\n2️⃣ 创建必要的文件夹结构...');
    
    const folders = [
      'images/today-news',
      'images/past-news',
      'videos/today-news',
      'videos/past-news'
    ];

    for (const folder of folders) {
      // 创建占位文件来建立文件夹结构
      const placeholderPath = `${folder}/.gitkeep`;
      const placeholderContent = 'This file maintains the folder structure';
      
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(placeholderPath, new Blob([placeholderContent], { type: 'text/plain' }), {
          upsert: true
        });

      if (uploadError && !uploadError.message.includes('already exists')) {
        console.log(`   ❌ 创建文件夹 ${folder} 失败: ${uploadError.message}`);
      } else {
        console.log(`   ✅ 文件夹 ${folder} 已准备就绪`);
      }
    }

    console.log('\n3️⃣ 测试上传权限...');
    
    const testFileName = `test-upload-${Date.now()}.txt`;
    const testContent = 'Supabase storage test file';
    const testPath = `images/today-news/${testFileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(testPath, new Blob([testContent], { type: 'text/plain' }), {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error(`❌ 测试上传失败: ${uploadError.message}`);
      console.log('\n💡 可能需要的 RLS 策略设置：');
      console.log('在 Supabase Dashboard 中：');
      console.log('1. 进入 Storage > Policies');
      console.log(`2. 为 ${STORAGE_BUCKET} 桶创建以下策略：`);
      console.log('');
      console.log('策略名: Allow service role full access');
      console.log('类型: All operations (SELECT, INSERT, UPDATE, DELETE)');
      console.log('目标角色: service_role');
      console.log('策略表达式: true');
      console.log('');
      console.log('或使用 SQL:');
      console.log(`create policy "Allow service role full access" on storage.objects for all using (bucket_id = '${STORAGE_BUCKET}');`);
    } else {
      console.log('✅ 测试上传成功');
      
      // 清理测试文件
      await supabase.storage.from(STORAGE_BUCKET).remove([testPath]);
      console.log('✅ 测试文件已清理');
    }

    console.log('\n✨ 设置完成！');
    console.log('\n📋 请确保在部署环境中设置以下环境变量：');
    console.log(`SUPABASE_URL=${supabaseUrl}`);
    console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    console.log('MAX_IMAGE_SIZE=10485760');
    console.log('MAX_VIDEO_SIZE=52428800');

  } catch (error) {
    console.error('❌ 设置过程中出现错误:', error.message);
  }
}

setupSupabaseStorage();
