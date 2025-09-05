// 🚀 Enhanced Progressive Loading Manager
class ProgressiveLoader {
  constructor() {
    this.isLoading = false;
    this.cache = new Map();
    this.cacheExpiry = 60000; // 增加到1分钟缓存
    this.currentPage = 0;
    this.pageSize = 10; // 分页加载
    this.allArticles = [];
    this.hasMore = true;
  }
  
  async loadArticles(page = 0, useCache = true) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingStatus('Loading articles...');
    
    try {
      // 🚀 更智能的缓存策略
      const cacheKey = `articles_page_${page}`;
      if (useCache) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          console.log('🚀 Using cached data, instant loading!');
          this.handleArticleData(cached, page);
          this.hideLoadingStatus();
          return;
        }
      }
      
      // 🚀 分页获取数据
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏰ API request timeout');
      }, 8000); // 减少到8秒超时
      
      const response = await fetch(`/api/articles?limit=${this.pageSize}&offset=${page * this.pageSize}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 🚀 处理新的API响应格式 或 向后兼容
      let articles, hasMore;
      if (data.articles) {
        // 新格式
        articles = data.articles;
        hasMore = data.hasMore;
      } else {
        // 旧格式（向后兼容）
        articles = Array.isArray(data) ? data : [];
        hasMore = articles.length === this.pageSize;
      }
      
      const processedData = { articles, hasMore };
      
      // 缓存数据
      this.setCache(cacheKey, processedData);
      
      // 处理数据
      this.handleArticleData(processedData, page);
      this.hideLoadingStatus();
      
      console.log('✅ Article data loading completed');
      
    } catch (error) {
      console.error('❌ Loading failed:', error);
      this.showError('Loading failed. Click to retry.');
    } finally {
      this.isLoading = false;
    }
  }
  
  handleArticleData(data, page) {
    const articles = data.articles || [];
    this.hasMore = data.hasMore !== undefined ? data.hasMore : true;
    
    if (page === 0) {
      // 首次加载
      this.allArticles = articles;
      this.renderContent(articles);
    } else {
      // 追加加载
      this.allArticles = [...this.allArticles, ...articles];
      this.appendArticles(articles);
    }
    
    this.currentPage = page;
  }
  
  renderContent(articles) {
    if (!Array.isArray(articles) || articles.length === 0) {
      this.showError('No articles available');
      return;
    }
    
    // Process data - 文章已经在API端排序，无需重复排序
    const featuredArticles = articles.filter(a => a.featured);
    const mainFeatured = featuredArticles.length > 0 ? featuredArticles[0] : articles[0];
    
    // Render featured article
    this.renderFeaturedArticle(mainFeatured);
    
    // 🚀 只显示最新的8篇文章，减少初始渲染量
    const latestArticles = articles.slice(0, 8);
    this.renderLatestArticles(latestArticles);
    
    // 🚀 延迟渲染全部文章列表
    setTimeout(() => {
      this.renderAllArticles(this.allArticles);
    }, 100);
    
    this.transitionToContent();
  }
  
  renderFeaturedArticle(article) {
    if (!article) return;
    
    const container = document.getElementById('featuredContent');
    if (!container) return;
    
    const categoryDisplay = article.category === 'TodayNews' ? 'Today News' : 'Past News';
    
    container.innerHTML = `
      <article class="featured-article">
        <div class="featured-image-container">
          <img src="${article.image}" alt="${article.title}" class="featured-image" 
               loading="eager" width="800" height="450" 
               onerror="this.onerror=null; this.src='/images/placeholder.svg'; this.classList.add('error');"
               onload="this.style.opacity='1'" 
               style="opacity:0.7; transition: opacity 0.3s ease">
          <div class="featured-overlay"></div>
        </div>
        
        <div class="featured-content">
          <a href="/category/${article.category}" class="category-tag ${article.category}">
            ${categoryDisplay}
          </a>
          
          <h2 class="featured-title">
            <a href="/article/${article.slug}">${article.title}</a>
          </h2>
          
          <p class="featured-excerpt">${article.excerpt}</p>
          
          <div class="featured-meta">
            <span class="featured-author">${article.author}</span>
            <span class="featured-date">${this.formatDate(article.publishDate)}</span>
          </div>
          
          <a href="/article/${article.slug}" class="featured-read-more btn">
            Read Full Story
          </a>
        </div>
      </article>
    `;
  }
  
  renderLatestArticles(articles) {
    const container = document.getElementById('latestArticlesGrid');
    if (!container || articles.length === 0) return;
    
    container.innerHTML = articles.map(article => `
      <a href="/article/${article.slug}" class="thumb-card overlay">
        <div class="thumb-image-wrap">
          <img src="${article.image}" alt="${article.title}" class="thumb-img"
               loading="lazy" onerror="this.src='/images/placeholder.svg'">
          <div class="thumb-gradient"></div>
          <div class="thumb-text">
            <div class="thumb-title white">${article.title}</div>
            <div class="thumb-date white">Updated ${this.formatDate(article.publishDate)}</div>
          </div>
        </div>
      </a>
    `).join('');
  }
  
  renderAllArticles(articles) {
    const container = document.getElementById('allArticlesList');
    if (!container || articles.length === 0) return;
    
    container.innerHTML = articles.map(article => `
      <a href="/article/${article.slug}" class="index-row">
        <img src="${article.image}" alt="${article.title}" class="index-thumb"
             loading="lazy" onerror="this.src='/images/placeholder.svg'">
        <div class="index-meta">
          <div class="index-title">${article.title}</div>
          <div class="index-sub">${this.formatDate(article.publishDate)}</div>
        </div>
      </a>
    `).join('');
  }
  
  transitionToContent() {
    // Smooth transition animation
    const transitions = [
      { skeleton: 'featuredSkeleton', content: 'featuredContent' },
      { skeleton: 'latestSkeleton', content: 'latestContent' },
      { skeleton: 'allArticlesSkeleton', content: 'allArticlesContent' }
    ];
    
    transitions.forEach(({ skeleton, content }, index) => {
      setTimeout(() => {
        const skeletonEl = document.getElementById(skeleton);
        const contentEl = document.getElementById(content);
        
        if (skeletonEl && contentEl) {
          skeletonEl.style.opacity = '0';
          setTimeout(() => {
            skeletonEl.style.display = 'none';
            contentEl.style.display = 'block';
            contentEl.style.opacity = '0';
            setTimeout(() => {
              contentEl.style.opacity = '1';
            }, 50);
          }, 300);
        }
      }, index * 200); // 错开动画时间
    });
  }
  
  showLoadingStatus(message) {
    const status = document.getElementById('loadingStatus');
    if (status) {
      status.innerHTML = `<div class="loading-dot"></div>${message}`;
      status.style.display = 'flex';
    }
  }
  
  hideLoadingStatus() {
    const status = document.getElementById('loadingStatus');
    if (status) {
      setTimeout(() => {
        status.style.opacity = '0';
        setTimeout(() => {
          status.style.display = 'none';
        }, 300);
      }, 500);
    }
  }
  
  showError(message) {
    this.hideLoadingStatus();
    const status = document.getElementById('loadingStatus');
    if (status) {
      status.innerHTML = `<span style="color: #dc2626; cursor: pointer;" onclick="location.reload()">❌ ${message}</span>`;
      status.style.display = 'flex';
    }
  }
  
  // Cache management
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }
  
  // 🔧 Unified date formatting method
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      
      // Check if it's a valid date
      if (isNaN(date.getTime())) {
        console.warn('⚠️ Invalid date:', dateString);
        return 'Invalid Date';
      }
      
      // Check for abnormal future dates (more than 1 year ahead)
      const now = new Date();
      const oneYearLater = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      if (date > oneYearLater) {
        console.warn('⚠️ Suspicious future date (>1 year):', dateString);
      }
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('❌ Date formatting error:', error);
      return 'Date Error';
    }
  }
}

// Initialize
// 🚀 修复竞态条件：检查 DOM 是否已经加载完成
async function initProgressiveLoader() {
  const loader = new ProgressiveLoader();
  
  // Start loading immediately
  await loader.loadArticles();
  
  // Set up other event listeners...
  const toggleBtn = document.getElementById('toggleAllArticlesBtn');
  const allSection = document.getElementById('allArticlesSection');
  
  if (toggleBtn && allSection) {
    toggleBtn.addEventListener('click', () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', (!expanded).toString());
      allSection.setAttribute('aria-hidden', expanded.toString());
      
      if (expanded) {
        allSection.classList.add('is-collapsed');
        allSection.classList.remove('is-expanded');
      } else {
        allSection.classList.remove('is-collapsed');
        allSection.classList.add('is-expanded');
      }
    });
  }
  
  // Newsletter form
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = e.target.querySelector('input[type="email"]');
      console.log('Newsletter subscription:', emailInput.value);
      alert('Thank you for subscribing!');
      e.target.reset();
    });
  }
  
  // Page Visibility API - update only when page is visible
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
      console.log('👁️ Page became visible, checking for updates...');
      // Clear cache, force refresh data
      loader.cache.clear();
      loader.loadArticles();
    }
  });
  
  // Listen for storage changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'imacx_articles') {
      console.log('📋 Articles updated in localStorage, refreshing...');
      loader.cache.clear();
      loader.loadArticles();
    }
  });
}

// 全局未处理 Promise 拒绝处理器 (浏览器环境)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', function(event) {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    console.error('Promise:', event.promise);
    // 防止默认的控制台错误输出
    event.preventDefault();
  });
}

// 包装 initProgressiveLoader 以捕获错误
async function safeInitProgressiveLoader() {
  try {
    await initProgressiveLoader();
  } catch (error) {
    console.error('❌ Progressive loader initialization failed:', error);
    // 显示错误信息给用户
    const status = document.getElementById('loadingStatus');
    if (status) {
      status.innerHTML = `<span style="color: #dc2626; cursor: pointer;" onclick="location.reload()">❌ Loading failed. Click to retry.</span>`;
      status.style.display = 'flex';
    }
  }
}

// 🚀 智能初始化：无论何时加载都能正确执行
if (document.readyState === 'loading') {
  // DOM 还在加载中，等待 DOMContentLoaded 事件
  document.addEventListener('DOMContentLoaded', safeInitProgressiveLoader);
} else {
  // DOM 已经加载完成，立即执行
  safeInitProgressiveLoader();
}
