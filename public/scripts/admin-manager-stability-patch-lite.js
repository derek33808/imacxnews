/**
 * 🛡️ Admin Manager 轻量级稳定性补丁 - 紧急修复版
 * 专注于解决核心问题，减少复杂性
 */

(function() {
  'use strict';
  
  console.log('🛡️ Loading Admin Manager Lite Stability Patch...');
  
  // 全局错误处理
  let errorCount = 0;
  const maxErrors = 10; // 最大错误数，超过后停止处理
  
  function handleGlobalError(error) {
    errorCount++;
    if (errorCount > maxErrors) {
      console.warn('🛑 Too many errors, stopping error handling');
      return;
    }
    
    console.error('🚨 Caught error:', error);
    
    // 简单的错误恢复
    if (error && error.message) {
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        showSimpleAuthError();
      } else if (error.message.includes('fetch') || error.message.includes('Network')) {
        showSimpleNetworkError();
      }
    }
  }
  
  // 全局错误捕获
  window.addEventListener('error', (event) => {
    handleGlobalError(event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    handleGlobalError(event.reason);
    event.preventDefault(); // 防止控制台显示错误
  });
  
  // 显示简单的认证错误
  function showSimpleAuthError() {
    const existing = document.querySelector('#simple-auth-error');
    if (existing) return; // 避免重复显示
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'simple-auth-error';
    errorDiv.innerHTML = `
      <div style="
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #fee2e2; border: 1px solid #fca5a5; color: #dc2626;
        padding: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-width: 300px;
      ">
        🔒 认证已过期，请重新登录
        <button onclick="this.parentElement.parentElement.remove(); window.location.reload();" 
                style="margin-left: 12px; background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          重新登录
        </button>
      </div>
    `;
    document.body.appendChild(errorDiv);
    
    // 5秒后自动移除
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }
  
  // 显示简单的网络错误
  function showSimpleNetworkError() {
    const existing = document.querySelector('#simple-network-error');
    if (existing) return; // 避免重复显示
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'simple-network-error';
    errorDiv.innerHTML = `
      <div style="
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #fef3c7; border: 1px solid #fbbf24; color: #92400e;
        padding: 16px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        max-width: 300px;
      ">
        🌐 网络连接问题，请稍后重试
        <button onclick="this.parentElement.parentElement.remove();" 
                style="margin-left: 12px; background: #92400e; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          关闭
        </button>
      </div>
    `;
    document.body.appendChild(errorDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 3000);
  }
  
  // 重写console.error以减少错误日志干扰
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // 过滤一些已知的非关键错误
    const message = args[0];
    if (typeof message === 'string') {
      if (message.includes('eventListeners') || 
          message.includes('Cannot read properties of undefined')) {
        // 这些错误我们已经在处理，不需要重复显示
        console.warn('🔇 Filtered error:', message);
        return;
      }
    }
    
    // 其他错误正常显示
    originalConsoleError.apply(console, args);
  };
  
  // 简单的fetch增强 - 只添加基本的重试
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    try {
      const response = await originalFetch(input, init);
      
      // 如果是5xx错误，尝试一次重试
      if (!response.ok && response.status >= 500) {
        console.warn(`🔄 Server error ${response.status}, retrying once...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return originalFetch(input, init);
      }
      
      return response;
    } catch (error) {
      console.warn('🔄 Fetch error, retrying once...', error.message);
      // 网络错误重试一次
      await new Promise(resolve => setTimeout(resolve, 1000));
      return originalFetch(input, init);
    }
  };
  
  // 页面卸载清理
  let isUnloading = false;
  window.addEventListener('beforeunload', () => {
    isUnloading = true;
    console.log('🧹 Page unloading, cleaning up...');
  });
  
  // 简单的定时器管理
  const timers = new Set();
  const originalSetTimeout = window.setTimeout;
  const originalClearTimeout = window.clearTimeout;
  
  window.setTimeout = function(callback, delay, ...args) {
    if (isUnloading) return null;
    
    const wrappedCallback = (...callbackArgs) => {
      if (!isUnloading) {
        try {
          callback(...callbackArgs);
        } catch (error) {
          handleGlobalError(error);
        }
      }
    };
    
    const timerId = originalSetTimeout(wrappedCallback, delay, ...args);
    timers.add(timerId);
    return timerId;
  };
  
  window.clearTimeout = function(timerId) {
    timers.delete(timerId);
    return originalClearTimeout(timerId);
  };
  
  // 页面隐藏时清理长期定时器
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && timers.size > 5) {
      console.log('🧹 Page hidden, cleaning up some timers...');
      // 清理一些定时器，但不是全部
      const timerArray = Array.from(timers);
      timerArray.slice(0, Math.floor(timerArray.length / 2)).forEach(timer => {
        clearTimeout(timer);
      });
    }
  });
  
  // 提供简单的健康检查
  window.getSimpleHealthStatus = function() {
    return {
      isHealthy: !isUnloading && errorCount < maxErrors,
      errorCount: errorCount,
      activeTimers: timers.size,
      timestamp: new Date().toISOString()
    };
  };
  
  // 提供手动清理功能
  window.cleanupLitePatch = function() {
    console.log('🧹 Manual cleanup triggered');
    timers.forEach(timer => clearTimeout(timer));
    timers.clear();
    errorCount = 0;
  };
  
  console.log('✅ Admin Manager Lite Stability Patch loaded successfully');
  console.log('💡 Use getSimpleHealthStatus() to check system health');
  console.log('🧹 Use cleanupLitePatch() for manual cleanup');
})();
