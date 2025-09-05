// 🚀 Netlify本地环境性能测试
import { performance } from 'perf_hooks';
import fetch from 'node-fetch';

const NETLIFY_URL = 'http://localhost:8888';

class NetlifyPerformanceTest {
  constructor() {
    this.results = {};
  }

  async checkNetlifyServer() {
    console.log('🔍 检查Netlify本地服务器状态...');
    try {
      const response = await fetch(NETLIFY_URL, { timeout: 5000 });
      if (response.ok) {
        console.log('✅ Netlify本地服务器运行正常');
        return true;
      } else {
        console.log(`❌ Netlify服务器响应状态: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log('❌ 无法连接到Netlify本地服务器:', error.message);
      console.log('💡 请确保已运行: netlify dev');
      return false;
    }
  }

  async testCacheHeaders() {
    console.log('\n🔍 测试缓存头设置...');
    
    const testUrls = [
      '/api/articles',
      '/scripts/progressive-loader.js',
      '/images/placeholder.svg',
      '/favicon.svg'
    ];

    for (const url of testUrls) {
      try {
        const response = await fetch(`${NETLIFY_URL}${url}`);
        const cacheControl = response.headers.get('cache-control');
        const vary = response.headers.get('vary');
        
        console.log(`  📄 ${url}:`);
        console.log(`    Cache-Control: ${cacheControl || '未设置'}`);
        console.log(`    Vary: ${vary || '未设置'}`);
        console.log(`    状态: ${response.status}`);
        
        this.results[url] = {
          status: response.status,
          cacheControl: cacheControl || 'none',
          vary: vary || 'none'
        };
      } catch (error) {
        console.log(`  ❌ ${url} 测试失败:`, error.message);
      }
    }
  }

  async testAPIPerformance() {
    console.log('\n🚀 测试Netlify环境下的API性能...');
    
    const endpoints = [
      '/api/articles?limit=10&offset=0',
      '/api/articles?limit=20&offset=0'
    ];

    for (const endpoint of endpoints) {
      const times = [];
      
      // 进行3次测试
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        
        try {
          const response = await fetch(`${NETLIFY_URL}${endpoint}`);
          const data = await response.json();
          const end = performance.now();
          
          times.push(end - start);
          console.log(`  ${endpoint} (测试 ${i + 1}): ${(end - start).toFixed(2)}ms`);
          
          // 检查响应格式
          if (i === 0) {
            if (data.articles && Array.isArray(data.articles)) {
              console.log(`    ✅ 响应格式正确: ${data.articles.length} articles, hasMore: ${data.hasMore}`);
            } else if (Array.isArray(data)) {
              console.log(`    ⚠️ 使用旧格式: ${data.length} articles`);
            } else {
              console.log(`    ❌ 响应格式异常:`, typeof data);
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`  ❌ ${endpoint} 测试失败:`, error.message);
        }
      }
      
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        this.results[`api_${endpoint}`] = {
          average: avg.toFixed(2),
          tests: times.length
        };
      }
    }
  }

  async testPageLoad() {
    console.log('\n📄 测试页面加载性能...');
    
    const pages = [
      '/',
      '/category/TodayNews',
      '/category/PastNews'
    ];

    for (const page of pages) {
      try {
        const start = performance.now();
        const response = await fetch(`${NETLIFY_URL}${page}`);
        const end = performance.now();
        
        if (response.ok) {
          console.log(`  ${page}: ${(end - start).toFixed(2)}ms`);
          this.results[`page_${page}`] = (end - start).toFixed(2);
        } else {
          console.log(`  ❌ ${page}: HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${page} 加载失败:`, error.message);
      }
    }
  }

  async testNetlifyFunctions() {
    console.log('\n⚡ 测试Netlify Functions性能...');
    
    try {
      // 测试健康检查
      const start = performance.now();
      const response = await fetch(`${NETLIFY_URL}/api/health`);
      const end = performance.now();
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  健康检查: ${(end - start).toFixed(2)}ms`);
        console.log(`  响应:`, data);
        this.results.healthCheck = (end - start).toFixed(2);
      } else {
        console.log(`  ❌ 健康检查失败: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ 健康检查错误:`, error.message);
    }
  }

  generateNetlifyReport() {
    console.log('\n📊 Netlify本地环境测试报告');
    console.log('='.repeat(60));
    
    // 缓存头检查
    console.log('\n🔧 缓存头配置:');
    Object.entries(this.results).forEach(([url, data]) => {
      if (url.startsWith('/')) {
        console.log(`  ${url}:`);
        console.log(`    状态: ${data.status}`);
        console.log(`    缓存控制: ${data.cacheControl}`);
        if (data.vary !== 'none') {
          console.log(`    Vary: ${data.vary}`);
        }
      }
    });
    
    // API性能
    console.log('\n🚀 API性能:');
    Object.entries(this.results).forEach(([key, data]) => {
      if (key.startsWith('api_')) {
        const endpoint = key.replace('api_', '');
        console.log(`  ${endpoint}: ${data.average}ms (${data.tests} 次测试)`);
      }
    });
    
    // 页面加载
    console.log('\n📄 页面加载:');
    Object.entries(this.results).forEach(([key, time]) => {
      if (key.startsWith('page_')) {
        const page = key.replace('page_', '');
        console.log(`  ${page}: ${time}ms`);
      }
    });
    
    // Functions
    if (this.results.healthCheck) {
      console.log('\n⚡ Netlify Functions:');
      console.log(`  健康检查: ${this.results.healthCheck}ms`);
    }
    
    console.log('\n🎯 Netlify环境评估:');
    
    // 检查API性能
    const apiTimes = Object.values(this.results)
      .filter(r => r && r.average)
      .map(r => parseFloat(r.average));
    
    if (apiTimes.length > 0) {
      const avgApiTime = apiTimes.reduce((a, b) => a + b, 0) / apiTimes.length;
      if (avgApiTime < 100) {
        console.log('  ✅ API性能优秀 (<100ms)');
      } else if (avgApiTime < 500) {
        console.log('  ✅ API性能良好 (<500ms)');
      } else {
        console.log('  ⚠️ API性能需要优化 (>500ms)');
      }
    }
    
    // 检查缓存头
    const cacheConfigs = Object.values(this.results)
      .filter(r => r && r.cacheControl)
      .map(r => r.cacheControl);
    
    const hasCacheControl = cacheConfigs.some(cc => cc !== 'none');
    if (hasCacheControl) {
      console.log('  ✅ 缓存头配置正确');
    } else {
      console.log('  ⚠️ 缓存头未正确配置');
    }
    
    console.log('\n🎉 Netlify本地环境测试完成!');
  }

  async run() {
    console.log('🚀 开始Netlify本地环境性能测试...\n');
    
    // 检查服务器状态
    const serverReady = await this.checkNetlifyServer();
    if (!serverReady) {
      console.log('\n❌ 无法连接到Netlify本地服务器');
      console.log('请先运行: netlify dev');
      return;
    }
    
    try {
      await this.testCacheHeaders();
      await this.testAPIPerformance();
      await this.testPageLoad();
      await this.testNetlifyFunctions();
      this.generateNetlifyReport();
    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error);
    }
  }
}

// 运行测试
const test = new NetlifyPerformanceTest();
test.run().catch(console.error);
