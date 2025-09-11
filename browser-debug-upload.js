// 浏览器控制台调试工具 - 复制并粘贴到浏览器控制台运行
// 在 imacxnews.netlify.app 的文章编辑页面运行

async function debugUploadIssue() {
  console.log('🔍 开始调试上传问题...\n');
  
  // 1. 检查当前页面状态
  console.log('1️⃣ 页面状态检查:');
  console.log('   URL:', window.location.href);
  console.log('   User Agent:', navigator.userAgent);
  console.log('   Online:', navigator.onLine);
  
  // 2. 检查认证状态
  console.log('\n2️⃣ 认证状态检查:');
  try {
    const authResponse = await fetch('/api/storage/verify-config', {
      credentials: 'include'
    });
    const authData = await authResponse.json();
    console.log('   认证检查:', authResponse.ok ? '✅ 成功' : '❌ 失败');
    if (authData.variables) {
      console.log('   环境变量:', authData.variables.SUPABASE_URL ? '✅' : '❌');
      console.log('   Service Key:', authData.variables.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
    }
  } catch (error) {
    console.log('   ❌ 认证检查失败:', error.message);
  }
  
  // 3. 检查DOM元素
  console.log('\n3️⃣ DOM元素检查:');
  const videoUploadSection = document.querySelector('#videoUploadSection');
  const uploadBtns = document.querySelectorAll('.upload-media-btn[data-type="video"]');
  console.log('   Video Upload Section:', videoUploadSection ? '✅ 找到' : '❌ 未找到');
  console.log('   Upload Buttons:', uploadBtns.length, '个');
  
  // 4. 模拟测试文件创建
  console.log('\n4️⃣ 创建测试文件:');
  const testContent = new Uint8Array(1024); // 1KB test file
  for (let i = 0; i < testContent.length; i++) {
    testContent[i] = Math.floor(Math.random() * 256);
  }
  const testFile = new File([testContent], 'test-video.mp4', {
    type: 'video/mp4',
    lastModified: Date.now()
  });
  console.log('   测试文件:', testFile.name, testFile.size + ' bytes', testFile.type);
  
  // 5. 测试不同的上传方法
  console.log('\n5️⃣ 测试上传方法:');
  
  // 方法1: 直接使用fetch (快速上传方式)
  try {
    console.log('   方法1: Fetch API 测试...');
    const formData1 = new FormData();
    formData1.append('file', testFile);
    formData1.append('category', 'TodayNews');
    
    const fetchResponse = await fetch('/api/media/simple-upload', {
      method: 'POST',
      body: formData1,
      credentials: 'include'
    });
    
    const fetchResult = await fetchResponse.json();
    console.log('   Fetch结果:', fetchResponse.ok ? '✅ 成功' : '❌ 失败');
    if (!fetchResponse.ok) {
      console.log('   错误:', fetchResult);
    } else {
      console.log('   URL:', fetchResult.data?.url);
      // 清理测试文件
      try {
        await fetch('/api/media/simple-upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: fetchResult.data?.path }),
          credentials: 'include'
        });
      } catch (e) { /* 忽略清理错误 */ }
    }
  } catch (error) {
    console.log('   ❌ Fetch测试失败:', error.message);
  }
  
  // 方法2: 使用XMLHttpRequest (文章编辑器方式)
  try {
    console.log('\n   方法2: XMLHttpRequest 测试...');
    const formData2 = new FormData();
    formData2.append('file', testFile);
    formData2.append('category', 'TodayNews');
    
    const xhrResult = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          console.log(`   进度: ${percent}%`);
        }
      };
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch (e) {
            reject(new Error('响应解析失败: ' + xhr.responseText));
          }
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText} - ${xhr.responseText}`));
        }
      };
      
      xhr.onerror = function() {
        reject(new Error('网络错误'));
      };
      
      xhr.open('POST', '/api/media/simple-upload');
      xhr.withCredentials = true;
      xhr.send(formData2);
    });
    
    console.log('   XHR结果: ✅ 成功');
    console.log('   URL:', xhrResult.data?.url);
  } catch (error) {
    console.log('   ❌ XHR测试失败:', error.message);
    
    // 分析错误类型
    if (error.message.includes('Internal Error')) {
      console.log('\n💡 Internal Error 分析:');
      console.log('   - 这是新的Supabase内部错误');
      console.log('   - 错误ID已更新，表明问题仍在发生');
      console.log('   - 可能的原因:');
      console.log('     • 文件路径冲突');
      console.log('     • 存储桶权限策略问题');
      console.log('     • Supabase服务临时问题');
      console.log('     • 网络连接问题');
    }
  }
  
  // 6. 检查控制台错误
  console.log('\n6️⃣ 控制台错误检查:');
  console.log('   检查控制台中是否有其他相关错误...');
  console.log('   请查看 Network 标签页中的失败请求详情');
  
  // 7. 建议修复步骤
  console.log('\n7️⃣ 建议修复步骤:');
  console.log('   1. 检查文件大小是否超出限制');
  console.log('   2. 尝试不同的文件格式');
  console.log('   3. 检查网络连接稳定性');
  console.log('   4. 清除浏览器缓存并重新登录');
  console.log('   5. 如果问题持续，可能是Supabase服务问题');
  
  console.log('\n✅ 调试完成！请检查上述结果并分享给开发者。');
}

// 运行调试
debugUploadIssue().catch(console.error);
