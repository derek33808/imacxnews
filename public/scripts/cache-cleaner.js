// 🚀 缓存清理工具 - 修复API格式不匹配问题
(function() {
  'use strict';
  
  function clearIncompatibleCache() {
    console.log('🧹 开始清理不兼容的缓存数据...');
    
    try {
      // 清理 localStorage 中的旧格式缓存
      const keysToCheck = [
        'category_articles_cache',
        'imacx_articles', 
        'homepage_articles_cache',
        'articles_cache'
      ];
      
      keysToCheck.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            // 检查是否是旧的数组格式，如果是则清理
            if (Array.isArray(parsed)) {
              localStorage.removeItem(key);
              console.log(`🗑️ 清理旧格式缓存: ${key}`);
            }
            // 检查是否包含无效数据
            else if (parsed && typeof parsed === 'object') {
              const articles = parsed.articles || parsed;
              if (Array.isArray(articles)) {
                const hasInvalidData = articles.some(article => 
                  !article || !article.id || !article.title
                );
                if (hasInvalidData) {
                  localStorage.removeItem(key);
                  console.log(`🗑️ 清理损坏的缓存: ${key}`);
                }
              }
            }
          } catch (e) {
            // 如果解析失败，直接清理
            localStorage.removeItem(key);
            console.log(`🗑️ 清理损坏的缓存数据: ${key}`);
          }
        }
      });
      
      // 清理时间戳相关的键
      const timeKeys = Object.keys(localStorage).filter(key => 
        key.includes('_cache_time') || key.includes('_timestamp')
      );
      timeKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ 清理时间戳: ${key}`);
      });
      
    } catch (error) {
      console.warn('清理localStorage时出错:', error);
    }
    
    // 清理 Service Worker 缓存
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('api') || cacheName.includes('articles')) {
            caches.delete(cacheName).then(() => {
              window.debugLog && window.debugLog(`🗑️ 清理Service Worker缓存: ${cacheName}`);
            });
          }
        });
      }).catch(error => {
        window.debugWarn && window.debugWarn('清理Service Worker缓存时出错:', error);
      });
    }
    
    console.log('✅ 缓存清理完成');
  }
  
  // 页面加载时自动清理
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clearIncompatibleCache);
  } else {
    clearIncompatibleCache();
  }
  
  // 暴露给全局，以便手动调用
  window.clearIncompatibleCache = clearIncompatibleCache;
  
})();
