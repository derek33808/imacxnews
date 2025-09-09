/**
 * 🛡️ Admin Manager 稳定性补丁
 * 解决页面闪退和不稳定问题
 * 
 * 主要修复：
 * 1. 内存泄漏和事件监听器管理
 * 2. 异步操作同步化
 * 3. 错误处理增强
 * 4. 缓存状态管理
 * 
 * 使用方法: 在页面加载后立即调用 initStabilityPatch()
 */

class AdminManagerStabilityPatch {
  constructor() {
    this.eventListeners = new Map(); // 事件监听器追踪
    this.runningOperations = new Set(); // 运行中的操作追踪
    this.timers = new Set(); // 定时器追踪
    this.isDestroying = false; // 销毁状态标记
    
    // 错误重试配置
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      backoffMultiplier: 2,
      maxDelay: 10000
    };
    
    this.initializePatch();
  }

  /**
   * 初始化补丁
   */
  initializePatch() {
    console.log('🛡️ Initializing Admin Manager Stability Patch...');
    
    // 1. 包装原有的事件监听器
    this.patchEventListeners();
    
    // 2. 增强错误处理
    this.enhanceErrorHandling();
    
    // 3. 添加页面卸载清理
    this.setupCleanupHandlers();
    
    // 4. 修复异步操作竞态
    this.patchAsyncOperations();
    
    // 5. 优化缓存操作
    this.optimizeCacheOperations();
    
    console.log('✅ Admin Manager Stability Patch initialized successfully');
  }

  /**
   * 包装事件监听器以追踪和管理
   */
  patchEventListeners() {
    const self = this;
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      // 存储监听器引用以便后续清理
      const listenerKey = `${this.constructor.name || 'Unknown'}_${type}`;
      if (!self.eventListeners.has(listenerKey)) {
        self.eventListeners.set(listenerKey, []);
      }
      self.eventListeners.get(listenerKey).push({
        element: this,
        listener,
        options
      });
      
      return originalAddEventListener.call(this, type, listener, options);
    };
    
    // 增强 removeEventListener
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      const listenerKey = `${this.constructor.name || 'Unknown'}_${type}`;
      const listeners = self.eventListeners.get(listenerKey);
      if (listeners) {
        const index = listeners.findIndex(l => l.listener === listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
      
      return originalRemoveEventListener.call(this, type, listener, options);
    };
  }

  /**
   * 增强错误处理
   */
  enhanceErrorHandling() {
    // 全局错误捕获
    window.addEventListener('error', (event) => {
      console.error('🚨 Global Error:', event.error);
      this.handleGlobalError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      this.handleGlobalError(event.reason);
    });

    // 包装原有的fetch以添加重试机制
    const self = this;
    const originalFetch = window.fetch;
    window.fetch = async function(input, init) {
      return self.fetchWithRetry(originalFetch, input, init);
    };
  }

  /**
   * 带重试机制的 fetch
   */
  async fetchWithRetry(originalFetch, input, init, retryCount = 0) {
    const operationId = `fetch_${Date.now()}_${Math.random()}`;
    this.runningOperations.add(operationId);

    try {
      const response = await originalFetch(input, init);
      
      // 检查响应状态
      if (!response.ok && response.status >= 500 && retryCount < this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount),
          this.retryConfig.maxDelay
        );
        
        console.warn(`🔄 Fetch failed (${response.status}), retrying in ${delay}ms... (attempt ${retryCount + 1})`);
        
        await new Promise(resolve => {
          const timer = setTimeout(resolve, delay);
          this.timers.add(timer);
        });
        
        return this.fetchWithRetry(originalFetch, input, init, retryCount + 1);
      }
      
      this.runningOperations.delete(operationId);
      return response;
    } catch (error) {
      if (retryCount < this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.initialDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount),
          this.retryConfig.maxDelay
        );
        
        console.warn(`🔄 Fetch error, retrying in ${delay}ms... (attempt ${retryCount + 1}):`, error.message);
        
        await new Promise(resolve => {
          const timer = setTimeout(resolve, delay);
          this.timers.add(timer);
        });
        
        return this.fetchWithRetry(originalFetch, input, init, retryCount + 1);
      }
      
      this.runningOperations.delete(operationId);
      throw error;
    }
  }

  /**
   * 处理全局错误
   */
  handleGlobalError(error) {
    if (this.isDestroying) return;

    // 根据错误类型采取不同的恢复策略
    if (error && error.message) {
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        this.handleAuthenticationError();
      } else if (error.message.includes('Network') || error.message.includes('fetch')) {
        this.handleNetworkError();
      } else if (error.message.includes('Cannot read property') || error.message.includes('undefined')) {
        this.handleDOMError();
      }
    }
  }

  /**
   * 处理认证错误
   */
  handleAuthenticationError() {
    console.warn('🔒 Authentication error detected, clearing auth state...');
    
    // 清理认证相关的缓存
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_session');
      localStorage.removeItem('admin_auth_state');
    } catch (e) {
      console.warn('⚠️ Failed to clear auth cache:', e);
    }
    
    // 显示友好的认证错误提示
    this.showAuthErrorDialog();
  }

  /**
   * 处理网络错误
   */
  handleNetworkError() {
    console.warn('🌐 Network error detected, implementing fallback...');
    
    // 启用离线模式或显示网络错误提示
    this.showNetworkErrorDialog();
  }

  /**
   * 处理DOM错误
   */
  handleDOMError() {
    console.warn('📋 DOM error detected, refreshing interface...');
    
    // 尝试重新初始化界面元素
    this.reinitializeInterface();
  }

  /**
   * 显示认证错误对话框
   */
  showAuthErrorDialog() {
    // 使用安全的方式显示错误信息
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 24px; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 10000;
        max-width: 400px; text-align: center;
      ">
        <h3 style="margin: 0 0 16px 0; color: #dc2626;">🔒 认证失败</h3>
        <p style="margin: 0 0 20px 0; color: #4b5563;">
          您的登录状态已过期，请重新登录以继续操作。
        </p>
        <button onclick="this.closest('div').remove(); window.location.reload();" style="
          background: #3b82f6; color: white; border: none;
          padding: 12px 24px; border-radius: 6px; cursor: pointer;
          font-weight: 600; transition: background 0.2s;
        " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
          重新登录
        </button>
      </div>
      <div onclick="this.closest('div').remove();" style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 9999;
      "></div>
    `;
    document.body.appendChild(dialog);
  }

  /**
   * 显示网络错误对话框
   */
  showNetworkErrorDialog() {
    const dialog = document.createElement('div');
    dialog.innerHTML = `
      <div style="
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 24px; border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 10000;
        max-width: 400px; text-align: center;
      ">
        <h3 style="margin: 0 0 16px 0; color: #dc2626;">🌐 网络连接问题</h3>
        <p style="margin: 0 0 20px 0; color: #4b5563;">
          网络连接不稳定，请检查网络连接后重试。
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button onclick="this.closest('div').remove();" style="
            background: #6b7280; color: white; border: none;
            padding: 12px 20px; border-radius: 6px; cursor: pointer;
            font-weight: 600;
          ">
            关闭
          </button>
          <button onclick="window.location.reload();" style="
            background: #3b82f6; color: white; border: none;
            padding: 12px 20px; border-radius: 6px; cursor: pointer;
            font-weight: 600;
          ">
            重试
          </button>
        </div>
      </div>
      <div onclick="this.closest('div').remove();" style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 9999;
      "></div>
    `;
    document.body.appendChild(dialog);
  }

  /**
   * 重新初始化界面
   */
  reinitializeInterface() {
    // 安全地重新初始化关键的UI元素
    setTimeout(() => {
      try {
        if (typeof loadArticlesList === 'function') {
          loadArticlesList(true);
        }
      } catch (e) {
        console.warn('⚠️ Failed to reinitialize interface:', e);
      }
    }, 1000);
  }

  /**
   * 设置页面卸载清理处理器
   */
  setupCleanupHandlers() {
    // 页面卸载前清理资源
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // 页面隐藏时清理部分资源
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.partialCleanup();
      }
    });
  }

  /**
   * 修复异步操作竞态条件
   */
  patchAsyncOperations() {
    // 包装 setTimeout 以追踪定时器
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = (callback, delay, ...args) => {
      if (this.isDestroying) {
        console.warn('⚠️ Ignoring setTimeout call during destruction');
        return null;
      }
      
      const wrappedCallback = (...callbackArgs) => {
        if (!this.isDestroying) {
          callback(...callbackArgs);
        }
      };
      
      const timerId = originalSetTimeout(wrappedCallback, delay, ...args);
      this.timers.add(timerId);
      return timerId;
    };

    // 包装 clearTimeout
    const originalClearTimeout = window.clearTimeout;
    window.clearTimeout = (timerId) => {
      this.timers.delete(timerId);
      return originalClearTimeout(timerId);
    };
  }

  /**
   * 优化缓存操作
   */
  optimizeCacheOperations() {
    // 防止同时进行多个缓存清理操作
    let cacheOperationInProgress = false;
    
    if (window.clearAllArticleCaches) {
      const originalClearCaches = window.clearAllArticleCaches;
      window.clearAllArticleCaches = async function() {
        if (cacheOperationInProgress) {
          console.log('🔄 Cache operation already in progress, skipping...');
          return;
        }
        
        cacheOperationInProgress = true;
        try {
          await originalClearCaches();
        } finally {
          cacheOperationInProgress = false;
        }
      };
    }
  }

  /**
   * 部分清理（页面隐藏时）
   */
  partialCleanup() {
    // 清理一些定时器，但保留重要的
    console.log('🧹 Performing partial cleanup...');
    
    // 清理超过30秒的定时器
    const now = Date.now();
    this.timers.forEach(timer => {
      if (now - timer > 30000) {
        clearTimeout(timer);
        this.timers.delete(timer);
      }
    });
  }

  /**
   * 完全清理资源
   */
  cleanup() {
    console.log('🧹 Performing full cleanup...');
    this.isDestroying = true;

    // 清理所有定时器
    this.timers.forEach(timer => {
      clearTimeout(timer);
    });
    this.timers.clear();

    // 清理所有事件监听器
    this.eventListeners.forEach((listeners, key) => {
      listeners.forEach(({ element, listener, options }) => {
        try {
          element.removeEventListener(key.split('_')[1], listener, options);
        } catch (e) {
          console.warn('⚠️ Failed to remove event listener:', e);
        }
      });
    });
    this.eventListeners.clear();

    // 清理运行中的操作
    this.runningOperations.clear();
  }

  /**
   * 获取系统健康状态
   */
  getHealthStatus() {
    return {
      isHealthy: !this.isDestroying && this.runningOperations.size < 10,
      runningOperations: this.runningOperations.size,
      activeTimers: this.timers.size,
      trackedListeners: Array.from(this.eventListeners.keys()).length
    };
  }
}

/**
 * 初始化稳定性补丁
 */
function initStabilityPatch() {
  if (window.adminStabilityPatch) {
    console.log('⚠️ Stability patch already initialized');
    return window.adminStabilityPatch;
  }

  window.adminStabilityPatch = new AdminManagerStabilityPatch();
  
  // 添加调试命令
  window.getAdminHealthStatus = () => {
    return window.adminStabilityPatch.getHealthStatus();
  };
  
  console.log('✅ Admin Manager Stability Patch ready');
  return window.adminStabilityPatch;
}

// 自动初始化（如果DOM已加载）
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStabilityPatch);
} else {
  initStabilityPatch();
}

// 导出初始化函数
window.initStabilityPatch = initStabilityPatch;
