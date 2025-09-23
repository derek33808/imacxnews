// 🚀 轻量级首页加载器 - 优化版本，减少初始加载时间
class LightweightHomepageLoader {
  constructor() {
    this.isLoading = false;
    this.cache = new Map();
    this.cacheExpiry = 30000; // 30秒缓存
  }
  
  async init() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingStatus('Loading content...');
    
    try {
      // 🚀 只加载最关键的数据：特色文章 + 最新6篇文章
      const response = await fetch('/api/articles?limit=10&offset=0', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // 静默处理401错误，直接显示默认内容
          this.handleAuthError();
          return;
        }
        if (response.status >= 500) {
          // 只记录服务器错误
          console.warn('Server error:', response.status);
        }
        this.handleAuthError();
        return;
      }
      
      const data = await response.json();
      const articles = data.articles || (Array.isArray(data) ? data : []);
      
      if (articles.length === 0) {
        this.showError('No articles available');
        return;
      }
      
      // 快速渲染关键内容
      this.renderCriticalContent(articles);
      
      // 延迟加载完整功能
      setTimeout(() => {
        this.loadFullFunctionality();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Loading failed:', error);
      this.showError('Loading failed. Click to retry.');
    } finally {
      this.isLoading = false;
    }
  }
  
  renderCriticalContent(articles) {
    // 渲染特色文章（简化版）
    const featured = articles.find(a => a.featured) || articles[0];
    this.renderSimpleFeatured(featured);
    
    // 渲染最新文章（简化版）
    const latest = articles.slice(0, 6);
    this.renderSimpleLatest(latest);
    
    this.transitionToContent();
    this.hideLoadingStatus();
  }
  
  renderSimpleFeatured(article) {
    const container = document.getElementById('featuredContent');
    if (!container || !article) return;
    
    const categoryDisplay = article.category === 'TodayNews' ? 'Today News' : 'Past News';
    const imageUrl = article.image || '/images/placeholder.svg';
    
    container.innerHTML = `
      <article class="featured-article">
        <div class="featured-image-container">
          <img src="${imageUrl}" alt="${article.title}" class="featured-image" 
               loading="eager" onerror="this.src='/images/placeholder.svg'">
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
  
  renderSimpleLatest(articles) {
    const container = document.getElementById('latestArticlesGrid');
    if (!container || articles.length === 0) return;
    
    container.innerHTML = articles.map(article => {
      const imageUrl = article.image || '/images/placeholder.svg';
      
      return `
        <a href="/article/${article.slug}" class="thumb-card">
          <div class="thumb-image-wrap" style="position: relative; aspect-ratio: 16/9; overflow: hidden; display: block;">
            <img src="${imageUrl}" alt="${article.title}" class="thumb-img"
                 loading="lazy" onerror="this.src='/images/placeholder.svg'"
                 style="width: 100%; height: 100%; object-fit: cover; object-position: center;">
            <div class="thumb-gradient"></div>
            <div class="thumb-text">
              <div class="thumb-title">${article.title}</div>
              <div class="thumb-date">${this.formatDate(article.publishDate)}</div>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }
  
  transitionToContent() {
    const transitions = [
      { skeleton: 'featuredSkeleton', content: 'featuredContent' },
      { skeleton: 'latestSkeleton', content: 'latestContent' }
    ];
    
    transitions.forEach(({ skeleton, content }, index) => {
      setTimeout(() => {
        const skeletonEl = document.getElementById(skeleton);
        const contentEl = document.getElementById(content);
        
        if (skeletonEl && contentEl) {
          skeletonEl.style.display = 'none';
          contentEl.style.display = 'block';
          contentEl.style.opacity = '1';
        }
      }, index * 100);
    });
  }
  
  loadFullFunctionality() {
    // 延迟加载完整的progressive-loader.js
    const script = document.createElement('script');
    script.src = '/scripts/progressive-loader.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Full functionality loaded');
      // 替换轻量级加载器
      if (window.progressiveLoader) {
        window.lightweightLoader = null;
      }
    };
    document.head.appendChild(script);
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
        setTimeout(() => status.style.display = 'none', 300);
      }, 500);
    }
  }
  
  handleAuthError() {
    // 显示默认内容，而不是错误信息
    const defaultArticle = {
      id: 'default',
      title: 'Welcome to IMACX News',
      excerpt: 'Stay updated with the latest news and insights from Avenues The World School',
      author: 'IMACX Team',
      category: 'TodayNews',
      slug: '#',
      image: '/images/placeholder.svg',
      publishDate: new Date().toISOString()
    };
    
    this.renderCriticalContent([defaultArticle]);
    this.loadFullFunctionality(); // 仍然加载完整功能
    this.isLoading = false;
  }
  
  showError(message) {
    this.hideLoadingStatus();
    const status = document.getElementById('loadingStatus');
    if (status) {
      status.innerHTML = `<span style="color: #dc2626; cursor: pointer;" onclick="location.reload()">❌ ${message}</span>`;
      status.style.display = 'flex';
    }
  }
  
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Date Error';
    }
  }
}

// 初始化轻量级加载器
if (typeof window !== 'undefined') {
  window.lightweightLoader = new LightweightHomepageLoader();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.lightweightLoader.init();
    });
  } else {
    window.lightweightLoader.init();
  }
}
