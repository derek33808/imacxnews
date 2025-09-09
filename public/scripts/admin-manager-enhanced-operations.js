/**
 * 🔧 Admin Manager 增强操作模块
 * 替换原有不稳定的操作函数
 * 
 * 主要功能：
 * 1. 稳定的文章加载
 * 2. 安全的表单提交
 * 3. 可靠的缓存管理
 * 4. 健壮的错误恢复
 */

(function() {
  'use strict';
  
  // 等待稳定性补丁加载完成（可选）
  function waitForStabilityPatch() {
    return new Promise((resolve) => {
      if (window.adminStabilityPatch) {
        resolve();
        return;
      }
      
      // 如果稳定性补丁不可用，等待最多1秒后继续
      const timeout = setTimeout(() => {
        resolve();
      }, 1000);
      
      const interval = setInterval(() => {
        if (window.adminStabilityPatch) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve();
        }
      }, 50);
    });
  }

  /**
   * 增强的文章列表加载函数
   */
  function enhancedLoadArticlesList(forceRefresh = false) {
    return new Promise(async (resolve, reject) => {
      try {
        await waitForStabilityPatch();
      } catch (e) {
        console.warn('⚠️ Stability patch not available, continuing without it');
      }
      
      const operationId = `loadArticles_${Date.now()}`;
      console.log(`📋 Enhanced article loading started: ${operationId}`);
      
      try {
        const articlesList = document.getElementById('articlesList');
        if (!articlesList) {
          throw new Error('Articles list container not found');
        }

        // 显示加载状态 - 但避免重复显示
        const hasLoadingState = articlesList.querySelector('.loading-state');
        const hasArticleContent = articlesList.querySelectorAll('.article-item, .media-section-header').length > 0;
        
        if (forceRefresh || (!hasLoadingState && !hasArticleContent)) {
          articlesList.innerHTML = `
            <div class="loading-state">
              <div style="
                display: flex; flex-direction: column; align-items: center; gap: 16px;
                padding: 40px; color: #6b7280;
              ">
                <div style="
                  width: 32px; height: 32px; border: 3px solid #e5e7eb;
                  border-top-color: #3b82f6; border-radius: 50%;
                  animation: spin 1s linear infinite;
                "></div>
                <p>Loading articles...</p>
              </div>
            </div>
          `;
        } else if (hasLoadingState) {
          console.log('⏳ Loading state already present, skipping duplicate loading UI');
        }

        // 构建API URL
        const apiUrl = '/api/articles';
        const fetchOptions = {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': forceRefresh ? 'no-cache' : 'public, max-age=60'
          },
          credentials: 'include'
        };

        console.log(`🌐 Fetching articles from: ${apiUrl}`);
        const response = await fetch(apiUrl, fetchOptions);
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            articlesList.innerHTML = createAuthErrorUI();
            resolve({ success: false, error: 'Authentication required' });
            return;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const responseData = await response.json();
        // API现在返回 { articles: [...], total, hasMore } 格式，需要提取 articles 数组
        const articles = responseData.articles || responseData; // 兼容新旧格式
        console.log(`📊 Loaded ${articles.length} articles`, { 
          responseFormat: responseData.articles ? 'new' : 'legacy',
          total: responseData.total || articles.length,
          hasMore: responseData.hasMore || false
        });

        // 渲染文章列表
        renderArticlesList(articles, articlesList);
        
        // 更新缓存
        try {
          localStorage.setItem('imacx_articles_cache', JSON.stringify(articles));
          localStorage.setItem('imacx_articles_cache_time', Date.now().toString());
          localStorage.setItem('imacx_articles_metadata', JSON.stringify({
            total: responseData.total || articles.length,
            hasMore: responseData.hasMore || false,
            fromCache: responseData.fromCache || false
          }));
        } catch (cacheError) {
          console.warn('⚠️ Failed to update cache:', cacheError);
        }

        resolve({ success: true, count: articles.length, total: responseData.total });
        
      } catch (error) {
        console.error(`❌ Enhanced article loading failed (${operationId}):`, error);
        
        // 尝试从缓存加载
        const fallbackData = await tryLoadFromCache();
        if (fallbackData) {
          renderArticlesList(fallbackData, articlesList);
          resolve({ success: true, count: fallbackData.length, fromCache: true });
        } else {
          // 显示错误状态
          articlesList.innerHTML = createErrorUI(error.message);
          reject(error);
        }
      }
    });
  }

  /**
   * 尝试从缓存加载数据
   */
  async function tryLoadFromCache() {
    try {
      const cachedData = localStorage.getItem('imacx_articles_cache');
      const cacheTime = localStorage.getItem('imacx_articles_cache_time');
      
      if (cachedData && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5 * 60 * 1000) { // 5分钟内的缓存
          console.log('📦 Loading articles from cache');
          return JSON.parse(cachedData);
        }
      }
    } catch (error) {
      console.warn('⚠️ Failed to load from cache:', error);
    }
    return null;
  }

  /**
   * 渲染文章列表
   */
  function renderArticlesList(articles, container) {
    // 确保 articles 是数组
    if (!Array.isArray(articles)) {
      console.error('❌ renderArticlesList: Expected array but got:', typeof articles, articles);
      container.innerHTML = createErrorUI('数据格式错误：期望数组格式的文章列表');
      return;
    }
    
    if (!articles || articles.length === 0) {
      container.innerHTML = createEmptyState();
      return;
    }

    const articlesHTML = articles.map(article => createArticleHTML(article)).join('');
    container.innerHTML = articlesHTML;
    
    // 重新绑定事件监听器
    bindArticleEvents(container);
  }

  /**
   * 创建文章HTML
   */
  function createArticleHTML(article) {
    const publishedDate = new Date(article.publishedAt || article.createdAt).toLocaleDateString();
    const isVideo = article.videoUrl && article.videoUrl.trim();
    const mediaClass = isVideo ? 'video-article' : 'image-article';
    const mediaTypeHtml = isVideo 
      ? '<span class="media-type-badge video-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>Video</span>'
      : '<span class="media-type-badge image-badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21,15 16,10 5,21"></polyline></svg>Image</span>';

    return `
      <div class="article-item ${mediaClass}" data-id="${article.id}">
        <div class="article-content">
          <div class="title-with-badge">
            <h3 class="article-title">${escapeHtml(article.title)}</h3>
            ${mediaTypeHtml}
          </div>
          <div class="article-meta">
            <span class="category">${escapeHtml(article.category)}</span>
            <span class="date">${publishedDate}</span>
            ${article.featured ? '<span class="featured-badge">⭐ Featured</span>' : ''}
          </div>
          <div class="article-preview">
            ${escapeHtml(article.content?.substring(0, 150) || 'No content available')}${article.content?.length > 150 ? '...' : ''}
          </div>
        </div>
        <div class="article-actions">
          <button class="edit-btn" data-action="edit" data-id="${article.id}" title="Edit article">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="m18.5 2.5 a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit
          </button>
          <button class="delete-btn" data-action="delete" data-id="${article.id}" title="Delete article">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="m19,6 v14 a2,2 0 0,1 -2,2 H7 a2,2 0 0,1 -2,-2 V6 m3,0 V4 a2,2 0 0,1 2,-2 h4 a2,2 0 0,1 2,2 v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 绑定文章事件
   */
  function bindArticleEvents(container) {
    // 使用事件委托避免重复绑定
    container.removeEventListener('click', handleArticleClick);
    container.addEventListener('click', handleArticleClick);
  }

  /**
   * 处理文章点击事件
   */
  async function handleArticleClick(event) {
    const target = event.target.closest('[data-action]');
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();

    const action = target.dataset.action;
    const articleId = target.dataset.id;

    try {
      if (action === 'edit') {
        await handleEditArticle(articleId);
      } else if (action === 'delete') {
        await handleDeleteArticle(articleId);
      }
    } catch (error) {
      console.error(`❌ Article ${action} failed:`, error);
      showErrorNotification(`Failed to ${action} article: ${error.message}`);
    }
  }

  /**
   * 处理文章编辑
   */
  async function handleEditArticle(articleId) {
    console.log(`✏️ Editing article: ${articleId}`);
    
    if (typeof openEditForm === 'function') {
      await openEditForm(articleId);
    } else {
      throw new Error('Edit function not available');
    }
  }

  /**
   * 处理文章删除
   */
  async function handleDeleteArticle(articleId) {
    console.log(`🗑️ Deleting article: ${articleId}`);
    
    const confirmed = await showConfirmDialog(
      'Delete Article',
      'Are you sure you want to delete this article? This action cannot be undone.'
    );
    
    if (!confirmed) return;

    const response = await fetch(`/api/articles/${articleId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete article (HTTP ${response.status})`);
    }

    // 触发列表刷新
    await enhancedLoadArticlesList(true);
    showSuccessNotification('Article deleted successfully');
  }

  /**
   * 创建认证错误UI
   */
  function createAuthErrorUI() {
    return `
      <div class="error-state">
        <div style="text-align: center; padding: 40px; color: #dc2626;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px;">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m4.9 4.9 14.2 14.2"></path>
          </svg>
          <h3>Authentication Required</h3>
          <p style="margin: 16px 0;">Please login as admin to manage articles.</p>
          <button onclick="if(window.openLoginModal) window.openLoginModal(); else window.location.reload();" 
                  style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
            Login
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 创建错误UI
   */
  function createErrorUI(errorMessage) {
    return `
      <div class="error-state">
        <div style="text-align: center; padding: 40px; color: #dc2626;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h3>Loading Error</h3>
          <p style="margin: 16px 0;">${escapeHtml(errorMessage)}</p>
          <button onclick="window.enhancedLoadArticlesList(true)" 
                  style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 创建空状态UI
   */
  function createEmptyState() {
    return `
      <div class="empty-state">
        <div style="text-align: center; padding: 40px; color: #6b7280;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <h3>No Articles Found</h3>
          <p style="margin: 16px 0;">Start by creating your first article.</p>
          <button onclick="if(typeof openCreateForm === 'function') openCreateForm()" 
                  style="background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer;">
            Create Article
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 显示确认对话框
   */
  function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.innerHTML = `
        <div style="
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5); z-index: 10000;
          display: flex; align-items: center; justify-content: center;
        ">
          <div style="
            background: white; padding: 24px; border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            max-width: 400px; width: 90%;
          ">
            <h3 style="margin: 0 0 16px 0; color: #111827;">${escapeHtml(title)}</h3>
            <p style="margin: 0 0 24px 0; color: #4b5563;">${escapeHtml(message)}</p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
              <button onclick="window.dialogResolve(false); this.closest('div[style*=\"position: fixed\"]').remove();" 
                      style="background: #6b7280; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                Cancel
              </button>
              <button onclick="window.dialogResolve(true); this.closest('div[style*=\"position: fixed\"]').remove();" 
                      style="background: #dc2626; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
      
      window.dialogResolve = resolve;
      document.body.appendChild(dialog);
    });
  }

  /**
   * 显示错误通知
   */
  function showErrorNotification(message) {
    showNotification(message, 'error');
  }

  /**
   * 显示成功通知
   */
  function showSuccessNotification(message) {
    showNotification(message, 'success');
  }

  /**
   * 显示通知
   */
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const colors = {
      error: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
      success: { bg: '#f0f9ff', border: '#60a5fa', text: '#1d4ed8' },
      info: { bg: '#f8fafc', border: '#94a3b8', text: '#475569' }
    };
    
    const color = colors[type] || colors.info;
    
    notification.innerHTML = `
      <div style="
        position: fixed; top: 20px; right: 20px; z-index: 10001;
        background: ${color.bg}; border: 1px solid ${color.border};
        color: ${color.text}; padding: 16px 20px; border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px; word-wrap: break-word;
        animation: slideIn 0.3s ease-out;
      ">
        ${escapeHtml(message)}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  /**
   * HTML转义函数
   */
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
  }

  // 导出增强的函数到全局作用域
  window.enhancedLoadArticlesList = enhancedLoadArticlesList;
  
  // 暂时禁用增强脚本以修复无限循环问题
  console.log('⚠️ Enhanced script temporarily disabled to fix infinite loop');
  // window.loadArticlesList = enhancedLoadArticlesList;
  
  // 添加CSS动画
  if (!document.querySelector('#enhanced-admin-styles')) {
    const style = document.createElement('style');
    style.id = 'enhanced-admin-styles';
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .article-item {
        transition: all 0.2s ease;
        border-left: 3px solid transparent;
      }
      
      .article-item:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
      
      .article-actions button {
        transition: all 0.2s ease;
      }
      
      .article-actions button:hover {
        transform: scale(1.05);
      }
      
      .edit-btn:hover {
        background: #3b82f6 !important;
        color: white !important;
      }
      
      .delete-btn:hover {
        background: #dc2626 !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
  }

  console.log('🔧 Admin Manager Enhanced Operations loaded');
})();
