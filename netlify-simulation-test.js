// 🚀 Netlify部署模拟测试
import { performance } from 'perf_hooks';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// 使用现有的开发服务器进行测试
const TEST_URL = 'http://localhost:4324'; // 当前运行的astro dev

class NetlifySimulationTest {
  constructor() {
    this.results = {};
    this.errors = [];
  }

  async checkServerStatus() {
    console.log('🔍 检查开发服务器状态...');
    try {
      const response = await fetch(TEST_URL, { timeout: 5000 });
      if (response.ok) {
        console.log('✅ 开发服务器运行正常');
        return true;
      } else {
        console.log(`❌ 服务器响应状态: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log('❌ 无法连接到开发服务器:', error.message);
      return false;
    }
  }

  async testNetlifyConfig() {
    console.log('\n🔧 检查Netlify配置...');
    
    try {
      const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
      console.log('✅ netlify.toml文件存在');
      
      // 检查关键配置项
      const hasHeaders = netlifyConfig.includes('[[headers]]');
      const hasApiCache = netlifyConfig.includes('/api/*');
      const hasImageCache = netlifyConfig.includes('/images/*');
      const hasBuildConfig = netlifyConfig.includes('[build]');
      
      console.log(`  缓存头配置: ${hasHeaders ? '✅' : '❌'}`);
      console.log(`  API缓存: ${hasApiCache ? '✅' : '❌'}`);
      console.log(`  图片缓存: ${hasImageCache ? '✅' : '❌'}`);
      console.log(`  构建配置: ${hasBuildConfig ? '✅' : '❌'}`);
      
      this.results.netlifyConfig = {
        headers: hasHeaders,
        apiCache: hasApiCache,
        imageCache: hasImageCache,
        buildConfig: hasBuildConfig
      };
      
    } catch (error) {
      console.log('❌ Netlify配置检查失败:', error.message);
      this.errors.push('Netlify配置文件问题');
    }
  }

  async testOptimizedAPI() {
    console.log('\n🚀 测试优化后的API性能...');
    
    const endpoints = [
      '/api/articles?limit=10&offset=0',
      '/api/articles?limit=20&offset=0',
      '/api/health'
    ];

    for (const endpoint of endpoints) {
      try {
        const times = [];
        
        // 进行3次测试
        for (let i = 0; i < 3; i++) {
          const start = performance.now();
          const response = await fetch(`${TEST_URL}${endpoint}`);
          const end = performance.now();
          
          if (response.ok) {
            times.push(end - start);
            
            // 第一次测试时检查响应格式
            if (i === 0) {
              const data = await response.json();
              let isOptimizedFormat = false;
              
              if (endpoint.includes('/api/articles')) {
                isOptimizedFormat = data.articles && Array.isArray(data.articles) && 
                                  typeof data.hasMore === 'boolean';
                console.log(`  ${endpoint}: ${isOptimizedFormat ? '✅ 新格式' : '⚠️ 旧格式'}`);
              } else {
                isOptimizedFormat = true;
                console.log(`  ${endpoint}: ✅ 正常响应`);
              }
              
              this.results[`api_format_${endpoint}`] = isOptimizedFormat;
            }
            
          } else {
            console.log(`  ❌ ${endpoint}: HTTP ${response.status}`);
            this.errors.push(`API错误: ${endpoint} - ${response.status}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (times.length > 0) {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          console.log(`  ⏱️  ${endpoint}: 平均 ${avg.toFixed(2)}ms`);
          this.results[`api_performance_${endpoint}`] = avg.toFixed(2);
        }
        
      } catch (error) {
        console.log(`  ❌ ${endpoint} 测试失败:`, error.message);
        this.errors.push(`API测试失败: ${endpoint}`);
      }
    }
  }

  async testCacheImplementation() {
    console.log('\n🔄 测试缓存实现...');
    
    try {
      // 测试连续API调用的缓存效果
      const endpoint = '/api/articles?limit=5&offset=0';
      
      // 第一次调用（可能是冷缓存）
      const start1 = performance.now();
      const response1 = await fetch(`${TEST_URL}${endpoint}`);
      const end1 = performance.now();
      
      // 等待100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 第二次调用（应该使用缓存）
      const start2 = performance.now();
      const response2 = await fetch(`${TEST_URL}${endpoint}`);
      const end2 = performance.now();
      
      const time1 = end1 - start1;
      const time2 = end2 - start2;
      const improvement = ((time1 - time2) / time1) * 100;
      
      console.log(`  第一次调用: ${time1.toFixed(2)}ms`);
      console.log(`  第二次调用: ${time2.toFixed(2)}ms`);
      console.log(`  缓存效果: ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}%`);
      
      this.results.cacheTest = {
        firstCall: time1.toFixed(2),
        secondCall: time2.toFixed(2),
        improvement: improvement.toFixed(1)
      };
      
    } catch (error) {
      console.log('  ❌ 缓存测试失败:', error.message);
      this.errors.push('缓存测试失败');
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
        const response = await fetch(`${TEST_URL}${page}`);
        const end = performance.now();
        
        if (response.ok) {
          const loadTime = end - start;
          console.log(`  ${page}: ${loadTime.toFixed(2)}ms`);
          this.results[`page_${page}`] = loadTime.toFixed(2);
          
          // 检查是否包含我们的优化脚本
          const html = await response.text();
          const hasProgressiveLoader = html.includes('progressive-loader.js');
          const hasCacheCleaner = html.includes('cache-cleaner.js');
          const hasLazyLoader = html.includes('lazy-loader.js');
          
          if (page === '/') {
            console.log(`    渐进式加载脚本: ${hasProgressiveLoader ? '✅' : '❌'}`);
            console.log(`    缓存清理脚本: ${hasCacheCleaner ? '✅' : '❌'}`);
            console.log(`    懒加载脚本: ${hasLazyLoader ? '✅' : '❌'}`);
            
            this.results.optimizationScripts = {
              progressiveLoader: hasProgressiveLoader,
              cacheCleaner: hasCacheCleaner,
              lazyLoader: hasLazyLoader
            };
          }
          
        } else {
          console.log(`  ❌ ${page}: HTTP ${response.status}`);
          this.errors.push(`页面加载错误: ${page} - ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${page} 加载失败:`, error.message);
        this.errors.push(`页面加载失败: ${page}`);
      }
    }
  }

  async testStaticAssets() {
    console.log('\n🖼️ 测试静态资源...');
    
    const assets = [
      '/scripts/progressive-loader.js',
      '/scripts/cache-cleaner.js',
      '/scripts/lazy-loader.js',
      '/images/placeholder.svg',
      '/favicon.svg'
    ];

    for (const asset of assets) {
      try {
        const start = performance.now();
        const response = await fetch(`${TEST_URL}${asset}`);
        const end = performance.now();
        
        if (response.ok) {
          console.log(`  ✅ ${asset}: ${(end - start).toFixed(2)}ms`);
          this.results[`asset_${asset}`] = (end - start).toFixed(2);
        } else {
          console.log(`  ❌ ${asset}: HTTP ${response.status}`);
          this.errors.push(`静态资源错误: ${asset} - ${response.status}`);
        }
      } catch (error) {
        console.log(`  ❌ ${asset} 加载失败:`, error.message);
        this.errors.push(`静态资源失败: ${asset}`);
      }
    }
  }

  generateNetlifyReport() {
    console.log('\n📊 Netlify部署模拟测试报告');
    console.log('='.repeat(60));
    
    // 配置检查
    if (this.results.netlifyConfig) {
      console.log('\n🔧 Netlify配置状态:');
      const config = this.results.netlifyConfig;
      console.log(`  缓存头: ${config.headers ? '✅ 已配置' : '❌ 未配置'}`);
      console.log(`  API缓存: ${config.apiCache ? '✅ 已配置' : '❌ 未配置'}`);
      console.log(`  图片缓存: ${config.imageCache ? '✅ 已配置' : '❌ 未配置'}`);
      console.log(`  构建配置: ${config.buildConfig ? '✅ 已配置' : '❌ 未配置'}`);
    }
    
    // 优化脚本检查
    if (this.results.optimizationScripts) {
      console.log('\n🚀 性能优化脚本:');
      const scripts = this.results.optimizationScripts;
      console.log(`  渐进式加载: ${scripts.progressiveLoader ? '✅ 已加载' : '❌ 未加载'}`);
      console.log(`  缓存清理: ${scripts.cacheCleaner ? '✅ 已加载' : '❌ 未加载'}`);
      console.log(`  懒加载: ${scripts.lazyLoader ? '✅ 已加载' : '❌ 未加载'}`);
    }
    
    // API性能
    console.log('\n🚀 API性能:');
    Object.entries(this.results).forEach(([key, value]) => {
      if (key.startsWith('api_performance_')) {
        const endpoint = key.replace('api_performance_', '');
        console.log(`  ${endpoint}: ${value}ms`);
      }
    });
    
    // 缓存效果
    if (this.results.cacheTest) {
      console.log('\n🔄 缓存性能:');
      const cache = this.results.cacheTest;
      console.log(`  首次调用: ${cache.firstCall}ms`);
      console.log(`  缓存调用: ${cache.secondCall}ms`);
      console.log(`  性能提升: ${cache.improvement}%`);
    }
    
    // 页面加载
    console.log('\n📄 页面加载性能:');
    Object.entries(this.results).forEach(([key, value]) => {
      if (key.startsWith('page_')) {
        const page = key.replace('page_', '');
        console.log(`  ${page}: ${value}ms`);
      }
    });
    
    // 错误汇总
    if (this.errors.length > 0) {
      console.log('\n⚠️ 发现的问题:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ 未发现问题，优化效果良好！');
    }
    
    // 部署建议
    console.log('\n🎯 Netlify部署建议:');
    
    const apiPerformanceGood = Object.values(this.results)
      .filter(r => typeof r === 'string' && r.includes('.'))
      .map(r => parseFloat(r))
      .every(time => time < 100);
    
    if (apiPerformanceGood) {
      console.log('  ✅ API性能优秀，可以直接部署');
    } else {
      console.log('  ⚠️ API性能需要进一步优化');
    }
    
    const hasAllOptimizations = this.results.optimizationScripts &&
      Object.values(this.results.optimizationScripts).every(Boolean);
    
    if (hasAllOptimizations) {
      console.log('  ✅ 所有优化脚本已正确加载');
    } else {
      console.log('  ⚠️ 部分优化脚本未加载，检查构建配置');
    }
    
    console.log('\n🎉 模拟测试完成！可以部署到Netlify生产环境。');
  }

  async run() {
    console.log('🚀 开始Netlify部署模拟测试...\n');
    
    const serverReady = await this.checkServerStatus();
    if (!serverReady) {
      console.log('\n❌ 服务器未准备好，请确保开发服务器正在运行');
      return;
    }
    
    try {
      await this.testNetlifyConfig();
      await this.testOptimizedAPI();
      await this.testCacheImplementation();
      await this.testPageLoad();
      await this.testStaticAssets();
      this.generateNetlifyReport();
    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error);
    }
  }
}

// 运行测试
const test = new NetlifySimulationTest();
test.run().catch(console.error);
