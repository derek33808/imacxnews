/**
 * 🔄 Global Cache Sync Manager - 全局缓存同步管理器
 * 
 * 功能：
 * 1. 管理所有页面的缓存版本控制
 * 2. 创建/删除文章时自动触发数据库同步
 * 3. 读取数据时检查缓存一致性
 * 4. 跨页面事件广播机制
 */

class CacheSyncManager {
  constructor() {
    this.CACHE_VERSION_KEY = 'imacx_cache_version';
    this.LAST_DB_SYNC_KEY = 'imacx_last_db_sync';
    this.CACHE_VALIDITY_DURATION = 30 * 1000; // 30秒缓存有效期
    
    // 缓存键名配置
    this.CACHE_KEYS = {
      articles: 'imacx_articles',
      articlesCache: 'imacx_articles_cache',
      categoryCache: 'category_articles_cache',
      categoryCacheTime: 'category_articles_cache_time',
      homepageCache: 'homepage_articles_cache',
      adminCache: 'admin_articles_cache'
    };
    
    // 初始化事件监听
    this.initEventListeners();
    this.initBroadcastChannel();
    
    console.log('🔄 Cache Sync Manager initialized');
  }

  /**
   * 初始化跨页面广播通道
   */
  initBroadcastChannel() {
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('imacx-cache-sync');
      this.broadcastChannel.addEventListener('message', (event) => {
        console.log('📻 Received broadcast message:', event.data);
        this.handleBroadcastMessage(event.data);
      });
    } else {
      // 降级到 localStorage 事件
      window.addEventListener('storage', (event) => {
        if (event.key === 'imacx_broadcast_message') {
          const message = JSON.parse(event.newValue || '{}');
          this.handleBroadcastMessage(message);
        }
      });
    }
  }

  /**
   * 处理广播消息
   */
  handleBroadcastMessage(data) {
    switch (data.type) {
      case 'ARTICLE_CREATED':
      case 'ARTICLE_UPDATED':
      case 'ARTICLE_DELETED':
        console.log(`🔄 Broadcasting: ${data.type} - triggering cache refresh`);
        this.forceRefreshAllCaches();
        // 触发页面特定的更新
        this.triggerPageUpdate(data.type, data.articleId);
        break;
      case 'CACHE_INVALIDATED':
        console.log('🧹 Broadcasting: Cache invalidated - clearing local caches');
        this.clearAllCaches();
        break;
    }
  }

  /**
   * 广播消息到所有页面
   */
  broadcastMessage(type, data = {}) {
    const message = {
      type,
      timestamp: Date.now(),
      source: window.location.pathname,
      ...data
    };

    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage(message);
    } else {
      // 降级到 localStorage
      localStorage.setItem('imacx_broadcast_message', JSON.stringify(message));
      setTimeout(() => localStorage.removeItem('imacx_broadcast_message'), 100);
    }
    
    console.log('📻 Broadcasting message:', message);
  }

  /**
   * 初始化事件监听器
   */
  initEventListeners() {
    // 监听文章相关事件
    window.addEventListener('articleCreated', (event) => {
      console.log('📝 Article created event detected');
      this.onArticleChange('ARTICLE_CREATED', event.detail?.articleId);
    });

    window.addEventListener('articleUpdated', (event) => {
      console.log('✏️ Article updated event detected');
      this.onArticleChange('ARTICLE_UPDATED', event.detail?.articleId);
    });

    window.addEventListener('articleDeleted', (event) => {
      console.log('🗑️ Article deleted event detected');
      this.onArticleChange('ARTICLE_DELETED', event.detail?.articleId);
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👀 Page became visible - checking cache consistency');
        this.checkCacheConsistency();
      }
    });

    // 监听页面焦点
    window.addEventListener('focus', () => {
      console.log('🔍 Window focused - checking cache consistency');
      this.checkCacheConsistency();
    });
  }

  /**
   * 文章变化事件处理
   */
  async onArticleChange(type, articleId) {
    console.log(`🔄 Processing ${type} for article:`, articleId);
    
    // 1. 更新缓存版本
    this.updateCacheVersion();
    
    // 2. 清除所有相关缓存
    this.clearAllCaches();
    
    // 3. 广播到其他页面
    this.broadcastMessage(type, { articleId });
    
    // 4. 触发数据库同步
    await this.triggerDatabaseSync();
    
    // 5. 强制刷新当前页面缓存
    await this.forceRefreshCurrentPage();
  }

  /**
   * 更新缓存版本号
   */
  updateCacheVersion() {
    const newVersion = Date.now();
    localStorage.setItem(this.CACHE_VERSION_KEY, newVersion.toString());
    localStorage.setItem(this.LAST_DB_SYNC_KEY, newVersion.toString());
    console.log('📦 Cache version updated to:', newVersion);
  }

  /**
   * 获取当前缓存版本
   */
  getCacheVersion() {
    return parseInt(localStorage.getItem(this.CACHE_VERSION_KEY) || '0');
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches() {
    console.log('🧹 Clearing all caches...');
    
    // 清除 localStorage 缓存
    Object.values(this.CACHE_KEYS).forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared localStorage: ${key}`);
      } catch (e) {
        console.warn(`⚠️ Failed to clear localStorage: ${key}`, e);
      }
    });

    // 清除 Service Worker 缓存
    if ('caches' in window) {
      Promise.all([
        caches.delete('api-cache'),
        caches.delete('articles-cache'),
        caches.delete('imacx-cache-v1')
      ]).then(() => {
        console.log('✅ Service Worker caches cleared');
      }).catch(e => {
        console.warn('⚠️ Failed to clear Service Worker caches', e);
      });
    }

    // 广播缓存失效
    this.broadcastMessage('CACHE_INVALIDATED');
  }

  /**
   * 强制刷新所有缓存
   */
  async forceRefreshAllCaches() {
    console.log('🔄 Force refreshing all caches...');
    
    this.clearAllCaches();
    
    // 如果当前页面有刷新函数，调用它
    if (typeof window.refreshPageData === 'function') {
      await window.refreshPageData();
    }
    
    // 如果是admin页面，刷新文章列表
    if (typeof window.forceRefreshAdminList === 'function') {
      await window.forceRefreshAdminList();
    }
    
    // 如果是category页面，触发文章更新
    if (typeof window.updateCategoryArticles === 'function') {
      await window.updateCategoryArticles();
    }
  }

  /**
   * 触发数据库同步
   */
  async triggerDatabaseSync() {
    console.log('🔄 Triggering database sync...');
    
    try {
      // 获取最新的文章数据
      const response = await fetch('/api/articles?' + new URLSearchParams({
        _t: Date.now().toString(),
        _force: 'true',
        _sync: 'true'
      }), {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Database sync successful, got', data.articles?.length || 0, 'articles');
        
        // 更新同步时间戳
        localStorage.setItem(this.LAST_DB_SYNC_KEY, Date.now().toString());
        
        return data;
      } else {
        throw new Error(`Database sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Database sync failed:', error);
      throw error;
    }
  }

  /**
   * 检查缓存一致性
   */
  async checkCacheConsistency() {
    console.log('🔍 Checking cache consistency...');
    
    const lastSync = parseInt(localStorage.getItem(this.LAST_DB_SYNC_KEY) || '0');
    const now = Date.now();
    
    // 如果超过有效期，强制同步
    if (now - lastSync > this.CACHE_VALIDITY_DURATION) {
      console.log('⚠️ Cache expired, forcing refresh...');
      await this.forceRefreshAllCaches();
      return false;
    }

    // 检查关键缓存是否存在
    const hasArticlesCache = localStorage.getItem(this.CACHE_KEYS.articles);
    const hasCategoryCache = localStorage.getItem(this.CACHE_KEYS.categoryCache);
    
    if (!hasArticlesCache && !hasCategoryCache) {
      console.log('⚠️ No valid cache found, triggering refresh...');
      await this.forceRefreshAllCaches();
      return false;
    }

    console.log('✅ Cache consistency check passed');
    return true;
  }

  /**
   * 强制刷新当前页面
   */
  async forceRefreshCurrentPage() {
    console.log('🔄 Force refreshing current page...');
    
    // 等待一小段时间确保API事务完成
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 根据页面类型执行不同的刷新逻辑
    const pathname = window.location.pathname;
    
    if (pathname.includes('/admin') || document.querySelector('.admin-manager-modal')) {
      // Admin 页面
      if (typeof window.forceRefreshAdminList === 'function') {
        await window.forceRefreshAdminList();
      }
    } else if (pathname.includes('/category/') || pathname === '/') {
      // Category 页面或首页
      if (typeof window.updateCategoryArticles === 'function') {
        await window.updateCategoryArticles();
      } else {
        // 降级方案：重新加载页面
        console.log('🔄 Fallback: Reloading page...');
        window.location.reload();
      }
    }
  }

  /**
   * 触发页面特定更新
   */
  triggerPageUpdate(eventType, articleId) {
    // 发送自定义事件到当前页面
    const event = new CustomEvent('cacheDataChanged', {
      detail: {
        type: eventType,
        articleId: articleId,
        timestamp: Date.now()
      }
    });
    
    window.dispatchEvent(event);
    console.log('📢 Triggered page update event:', eventType);
  }

  /**
   * 获取缓存同步状态
   */
  getSyncStatus() {
    const lastSync = parseInt(localStorage.getItem(this.LAST_DB_SYNC_KEY) || '0');
    const cacheVersion = this.getCacheVersion();
    const now = Date.now();
    
    return {
      lastSync,
      cacheVersion,
      isExpired: now - lastSync > this.CACHE_VALIDITY_DURATION,
      timeSinceSync: now - lastSync,
      hasValidCache: lastSync > 0 && (now - lastSync <= this.CACHE_VALIDITY_DURATION)
    };
  }
}

// 全局初始化
window.CacheSyncManager = CacheSyncManager;

// 创建全局实例
if (!window.cacheSyncManager) {
  window.cacheSyncManager = new CacheSyncManager();
}

// 导出便利方法到全局
window.clearAllArticleCaches = function() {
  console.log('🧹 Global cache clear triggered...');
  if (window.cacheSyncManager) {
    window.cacheSyncManager.clearAllCaches();
  }
};

window.triggerDatabaseSync = function() {
  console.log('🔄 Global database sync triggered...');
  if (window.cacheSyncManager) {
    return window.cacheSyncManager.triggerDatabaseSync();
  }
};

window.checkCacheConsistency = function() {
  console.log('🔍 Global cache consistency check triggered...');
  if (window.cacheSyncManager) {
    return window.cacheSyncManager.checkCacheConsistency();
  }
};

console.log('🚀 Cache Sync Manager loaded and ready');
