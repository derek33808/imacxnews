// 调试工具 - 生产环境调试信息控制
(function() {
  'use strict';
  
  // 检测是否为开发环境
  window.isDevelopment = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.includes('localhost') ||
                        window.location.hostname.includes('.local') ||
                        window.location.search.includes('debug=true');
  
  // 调试日志函数
  window.debugLog = function(...args) {
    if (window.isDevelopment) {
      console.log(...args);
    }
  };
  
  // 调试信息函数
  window.debugInfo = function(...args) {
    if (window.isDevelopment) {
      console.info(...args);
    }
  };
  
  // 调试警告函数
  window.debugWarn = function(...args) {
    if (window.isDevelopment) {
      console.warn(...args);
    }
  };
  
  // 调试错误函数（这个始终显示，因为错误很重要）
  window.debugError = function(...args) {
    console.error(...args);
  };
  
  // 调试表格函数
  window.debugTable = function(...args) {
    if (window.isDevelopment) {
      console.table(...args);
    }
  };
  
  // 调试分组函数
  window.debugGroup = function(...args) {
    if (window.isDevelopment) {
      console.group(...args);
    }
  };
  
  window.debugGroupEnd = function() {
    if (window.isDevelopment) {
      console.groupEnd();
    }
  };
  
  // 性能调试函数
  window.debugTime = function(label) {
    if (window.isDevelopment) {
      console.time(label);
    }
  };
  
  window.debugTimeEnd = function(label) {
    if (window.isDevelopment) {
      console.timeEnd(label);
    }
  };
  
  if (window.isDevelopment) {
    console.log('🐞 Debug utilities loaded. Development mode:', window.isDevelopment);
  }
})();
