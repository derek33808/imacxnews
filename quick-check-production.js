// 快速检查生产环境 Netlify 存储配置
// 使用方法: node quick-check-production.js https://your-site.netlify.app

const https = require('https');
const http = require('http');
const { URL } = require('url');

async function checkProductionConfig(siteUrl) {
  if (!siteUrl) {
    console.log('❌ 请提供 Netlify 站点 URL');
    console.log('');
    console.log('使用方法:');
    console.log('  node quick-check-production.js https://your-site.netlify.app');
    console.log('');
    console.log('或者直接在浏览器中访问:');
    console.log('  https://your-site.netlify.app/admin/storage-check');
    console.log('  https://your-site.netlify.app/api/storage/verify-config');
    return;
  }

  console.log('🔍 快速检查生产环境配置');
  console.log('=' .repeat(50));
  console.log(`站点: ${siteUrl}`);
  console.log('');

  try {
    // 测试 API 端点
    const apiUrl = `${siteUrl}/api/storage/verify-config`;
    console.log('📡 调用配置验证API...');
    console.log(`URL: ${apiUrl}`);
    
    const response = await makeRequest(apiUrl);
    
    if (response.error) {
      console.log('❌ API 请求失败:', response.error);
      console.log('');
      console.log('💡 可能的原因:');
      console.log('  1. 站点还未部署或 URL 不正确');
      console.log('  2. API 端点不存在（需要重新部署）');
      console.log('  3. 服务器错误');
      console.log('');
      console.log('🔧 建议操作:');
      console.log('  1. 确认 Netlify 站点 URL 正确');
      console.log('  2. 确保最新代码已部署');
      console.log('  3. 检查 Netlify 部署日志');
      return;
    }

    // 解析响应
    const data = JSON.parse(response.data);
    console.log('✅ API 调用成功!');
    console.log('');

    // 显示总体状态
    if (data.overallStatus) {
      const status = data.overallStatus.ready ? '✅ 完全就绪' : '⚠️ 需要配置';
      const score = data.overallStatus.score || 0;
      const maxScore = data.overallStatus.maxScore || 5;
      
      console.log('📊 总体状态');
      console.log('-' .repeat(20));
      console.log(`状态: ${status}`);
      console.log(`得分: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);
      console.log(`总结: ${data.overallStatus.summary}`);
      console.log('');
    }

    // 显示环境变量状态
    if (data.variables) {
      console.log('🔧 环境变量状态');
      console.log('-' .repeat(20));
      for (const [key, value] of Object.entries(data.variables)) {
        console.log(`${key}: ${value}`);
      }
      console.log('');
    }

    // 显示 Supabase 连接状态
    if (data.supabase) {
      console.log('🔗 Supabase 连接状态');
      console.log('-' .repeat(25));
      console.log(`连接: ${data.supabase.connection ? '✅ 成功' : '❌ 失败'}`);
      
      if (data.supabase.buckets && data.supabase.buckets.length > 0) {
        console.log(`存储桶: 找到 ${data.supabase.buckets.length} 个`);
      }
      
      if (data.supabase.targetBucket) {
        console.log(`imacx-media: ${data.supabase.targetBucket.status || data.supabase.targetBucket}`);
      }
      
      if (data.supabase.uploadTest) {
        console.log(`上传测试: ${data.supabase.uploadTest}`);
      }
      
      if (data.supabase.error) {
        console.log(`错误: ${data.supabase.error}`);
      }
      console.log('');
    }

    // 显示建议操作
    if (data.recommendations && data.recommendations.length > 0) {
      console.log('💡 建议操作');
      console.log('-' .repeat(15));
      data.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      console.log('');
    }

    // 显示访问链接
    console.log('🌐 在线检查');
    console.log('-' .repeat(15));
    console.log(`管理界面: ${siteUrl}/admin/storage-check`);
    console.log(`API端点: ${siteUrl}/api/storage/verify-config`);
    console.log('');

    // 总结
    if (data.overallStatus && data.overallStatus.ready) {
      console.log('🎉 恭喜！你的存储配置已完全就绪！');
      console.log('现在可以正常上传图片和视频文件了。');
    } else {
      console.log('⚠️ 配置不完整，请按照建议操作后重新检查。');
      console.log('');
      console.log('📋 常见问题解决方案:');
      console.log('1. 缺少环境变量 → 在 Netlify Dashboard 中添加');
      console.log('2. 存储桶不存在 → 在 Supabase 中创建 imacx-media 桶');  
      console.log('3. 权限错误 → 设置正确的 RLS 策略');
      console.log('4. 配置更改后需要重新部署站点');
    }

  } catch (error) {
    console.log('❌ 检查失败:', error.message);
  }
}

function makeRequest(url) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ data });
        } else {
          resolve({ error: `HTTP ${res.statusCode}: ${res.statusMessage}` });
        }
      });
    });
    
    req.on('error', (error) => {
      resolve({ error: error.message });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ error: '请求超时' });
    });
  });
}

// 获取命令行参数
const siteUrl = process.argv[2];

if (!siteUrl) {
  console.log('🚀 Netlify 存储配置快速检查工具');
  console.log('');
  console.log('使用方法:');
  console.log('  node quick-check-production.js https://your-site.netlify.app');
  console.log('');
  console.log('示例:');
  console.log('  node quick-check-production.js https://imacx-news.netlify.app');
  console.log('');
  console.log('或者直接在浏览器中访问:');
  console.log('  https://your-site.netlify.app/admin/storage-check');
  console.log('');
} else {
  checkProductionConfig(siteUrl);
}
