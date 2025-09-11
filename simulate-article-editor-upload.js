// 模拟文章编辑器上传过程，复现问题
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { createReadStream } from 'fs';

const supabaseUrl = 'https://ihkdquydhciabhrwffkb.supabase.co';
// 注意：这里需要设置环境变量
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 模拟文章编辑器上传过程\n');

if (!supabaseServiceKey) {
  console.log('❌ 请设置环境变量:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.log('');
  console.log('💡 从 Supabase Dashboard > Settings > API 获取');
  process.exit(1);
}

async function simulateArticleEditorUpload() {
  console.log('1️⃣ 初始化 Supabase 客户端...');
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 创建测试文件（模拟视频文件）
    console.log('2️⃣ 创建测试文件...');
    const testContent = Buffer.from('TEST VIDEO CONTENT - This simulates a video file upload from article editor');
    const testFileName = `test-article-video-${Date.now()}.mp4`;
    const testPath = `videos/today-news/${testFileName}`;

    console.log(`   - 文件名: ${testFileName}`);
    console.log(`   - 存储路径: ${testPath}`);
    console.log(`   - 文件大小: ${testContent.length} bytes`);
    console.log('');

    // 测试1: 直接上传（与文章编辑器相同的流程）
    console.log('3️⃣ 测试直接上传到 Supabase...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('imacx-media')
      .upload(testPath, testContent, {
        cacheControl: '31536000',
        upsert: false,
        contentType: 'video/mp4'
      });

    if (uploadError) {
      console.log('❌ 直接上传失败:');
      console.log('   错误信息:', uploadError.message);
      console.log('   错误代码:', uploadError.status);
      console.log('   完整错误:', JSON.stringify(uploadError, null, 2));
      
      // 分析错误类型
      if (uploadError.message.includes('Internal Error')) {
        console.log('\n💡 Internal Error 分析:');
        console.log('   - 可能是存储桶权限问题');
        console.log('   - 可能是文件路径或命名冲突');
        console.log('   - 可能是 Supabase 服务临时问题');
        console.log('   - 可能是网络连接问题');
        
        // 尝试不同的路径
        console.log('\n4️⃣ 尝试不同的上传路径...');
        const alternativePaths = [
          `videos/test/${testFileName}`,
          `images/today-news/${testFileName.replace('.mp4', '.txt')}`,
          `test/${testFileName}`
        ];
        
        for (const altPath of alternativePaths) {
          console.log(`   测试路径: ${altPath}`);
          const { data: altData, error: altError } = await supabase.storage
            .from('imacx-media')
            .upload(altPath, testContent, {
              cacheControl: '3600',
              upsert: true
            });
          
          if (altError) {
            console.log(`   ❌ 失败: ${altError.message}`);
          } else {
            console.log(`   ✅ 成功: ${altData.path}`);
            
            // 清理测试文件
            await supabase.storage.from('imacx-media').remove([altPath]);
            console.log(`   🗑️ 已清理: ${altPath}`);
            break;
          }
        }
      }
    } else {
      console.log('✅ 直接上传成功:');
      console.log('   路径:', uploadData.path);
      console.log('   ID:', uploadData.id);
      
      // 获取公共URL
      const { data: { publicUrl } } = supabase.storage
        .from('imacx-media')
        .getPublicUrl(testPath);
      console.log('   公共URL:', publicUrl);
      
      // 清理测试文件
      const { error: deleteError } = await supabase.storage
        .from('imacx-media')
        .remove([testPath]);
      
      if (deleteError) {
        console.log('   ⚠️ 清理失败:', deleteError.message);
      } else {
        console.log('   ✅ 测试文件已清理');
      }
    }

    // 测试2: 检查存储桶状态
    console.log('\n5️⃣ 检查存储桶详细状态...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log('❌ 获取存储桶列表失败:', bucketError.message);
    } else {
      const targetBucket = buckets.find(b => b.name === 'imacx-media');
      if (targetBucket) {
        console.log('✅ imacx-media 存储桶详情:');
        console.log(JSON.stringify(targetBucket, null, 2));
      }
    }

    // 测试3: 检查videos文件夹权限
    console.log('\n6️⃣ 检查 videos 文件夹权限...');
    const { data: videoFiles, error: listError } = await supabase.storage
      .from('imacx-media')
      .list('videos', { limit: 5 });
    
    if (listError) {
      console.log('❌ 无法访问 videos 文件夹:', listError.message);
      
      // 尝试创建文件夹
      console.log('   🔧 尝试创建 videos 文件夹结构...');
      const { error: createError } = await supabase.storage
        .from('imacx-media')
        .upload('videos/.gitkeep', new Blob([''], { type: 'text/plain' }), {
          upsert: true
        });
      
      if (createError) {
        console.log('   ❌ 创建文件夹失败:', createError.message);
      } else {
        console.log('   ✅ 文件夹创建成功');
      }
    } else {
      console.log('✅ videos 文件夹可访问:');
      console.log(`   包含 ${videoFiles.length} 个文件`);
      videoFiles.forEach(file => {
        console.log(`   - ${file.name} (${file.metadata?.size || 'unknown'} bytes)`);
      });
    }

  } catch (error) {
    console.log('💥 测试过程中出现异常:');
    console.log('   错误:', error.message);
    console.log('   堆栈:', error.stack);
  }
}

console.log('🚀 开始模拟测试...\n');
simulateArticleEditorUpload().catch(console.error);
