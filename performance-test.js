// 🚀 性能测试脚本
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:4324'; // Using Astro dev server with all optimizations

class PerformanceTest {
  constructor() {
    this.results = {};
  }

  async measureApiPerformance() {
    console.log('🚀 测试API性能...');
    
    const endpoints = [
      '/api/articles',
      '/api/articles?limit=10&offset=0',
      '/api/articles?limit=20&offset=0'
    ];

    for (const endpoint of endpoints) {
      const times = [];
      
      // 进行5次测试
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        
        try {
          const response = await fetch(`${BASE_URL}${endpoint}`);
          const data = await response.json();
          const end = performance.now();
          
          times.push(end - start);
          console.log(`  ${endpoint} (测试 ${i + 1}): ${(end - start).toFixed(2)}ms`);
          
          // 等待100ms再进行下一次测试
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`  ${endpoint} 测试失败:`, error.message);
        }
      }
      
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        
        this.results[endpoint] = {
          average: avg.toFixed(2),
          min: min.toFixed(2),
          max: max.toFixed(2),
          tests: times.length
        };
        
        console.log(`  📊 ${endpoint} 统计:`, this.results[endpoint]);
      }
    }
  }

  async measureCacheEffectiveness() {
    console.log('\n🔄 测试缓存效果...');
    
    const endpoint = '/api/articles?limit=10&offset=0';
    
    // 第一次请求（冷缓存）
    const start1 = performance.now();
    const response1 = await fetch(`${BASE_URL}${endpoint}`);
    const data1 = await response1.json();
    const end1 = performance.now();
    
    console.log(`  冷缓存请求: ${(end1 - start1).toFixed(2)}ms`);
    
    // 等待500ms
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 第二次请求（热缓存）
    const start2 = performance.now();
    const response2 = await fetch(`${BASE_URL}${endpoint}`);
    const data2 = await response2.json();
    const end2 = performance.now();
    
    console.log(`  热缓存请求: ${(end2 - start2).toFixed(2)}ms`);
    
    const improvement = ((end1 - start1) - (end2 - start2)) / (end1 - start1) * 100;
    console.log(`  🚀 缓存提升: ${improvement.toFixed(1)}%`);
    
    this.results.cache = {
      cold: (end1 - start1).toFixed(2),
      hot: (end2 - start2).toFixed(2),
      improvement: improvement.toFixed(1)
    };
  }

  async measureImageLoadingPerformance() {
    console.log('\n🖼️ 测试图片加载性能...');
    
    try {
      // 测试占位图加载
      const start = performance.now();
      const response = await fetch(`${BASE_URL}/images/placeholder.svg`);
      const end = performance.now();
      
      if (response.ok) {
        console.log(`  占位图加载时间: ${(end - start).toFixed(2)}ms`);
        this.results.placeholderImage = (end - start).toFixed(2);
      } else {
        console.log(`  ❌ 占位图加载失败: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ 占位图测试错误:`, error.message);
    }
  }

  async generateReport() {
    console.log('\n📊 性能测试报告');
    console.log('='.repeat(50));
    
    if (this.results['/api/articles']) {
      console.log('\n🚀 API性能:');
      Object.entries(this.results).forEach(([endpoint, stats]) => {
        if (endpoint.startsWith('/api/')) {
          console.log(`  ${endpoint}:`);
          console.log(`    平均响应时间: ${stats.average}ms`);
          console.log(`    最快响应: ${stats.min}ms`);
          console.log(`    最慢响应: ${stats.max}ms`);
        }
      });
    }
    
    if (this.results.cache) {
      console.log('\n🔄 缓存效果:');
      console.log(`  冷缓存: ${this.results.cache.cold}ms`);
      console.log(`  热缓存: ${this.results.cache.hot}ms`);
      console.log(`  性能提升: ${this.results.cache.improvement}%`);
    }
    
    if (this.results.placeholderImage) {
      console.log('\n🖼️ 图片加载:');
      console.log(`  占位图: ${this.results.placeholderImage}ms`);
    }
    
    console.log('\n🎯 性能建议:');
    
    // 基于结果提供建议
    const apiAvg = parseFloat(this.results['/api/articles']?.average || 0);
    if (apiAvg > 1000) {
      console.log('  ⚠️ API响应时间偏高，考虑优化数据库查询或增加缓存');
    } else if (apiAvg < 100) {
      console.log('  ✅ API响应时间优秀');
    } else {
      console.log('  ✅ API响应时间良好');
    }
    
    const cacheImprovement = parseFloat(this.results.cache?.improvement || 0);
    if (cacheImprovement > 50) {
      console.log('  ✅ 缓存效果显著，大幅提升性能');
    } else if (cacheImprovement > 20) {
      console.log('  ✅ 缓存效果良好');
    } else {
      console.log('  ⚠️ 缓存效果有限，可能需要调整缓存策略');
    }
  }

  async run() {
    console.log('🚀 开始性能测试...\n');
    
    try {
      await this.measureApiPerformance();
      await this.measureCacheEffectiveness();
      await this.measureImageLoadingPerformance();
      await this.generateReport();
    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error);
    }
    
    console.log('\n✅ 性能测试完成!');
  }
}

// 运行测试
const test = new PerformanceTest();
test.run().catch(console.error);
