// 🚀 Progressive Loading Manager
class ProgressiveLoader {
  constructor() {
    this.isLoading = false;
    this.cache = new Map();
    this.cacheExpiry = 30000; // 30 second cache
  }
  
  async loadArticles() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingStatus('Loading articles...');
    
    try {
      // Check cache
      const cached = this.getFromCache('articles');
      if (cached) {
        console.log('🚀 Using cached data, instant loading!');
        this.renderContent(cached);
        this.hideLoadingStatus();
        return;
      }
      
      // Fetch data from API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏰ API request timeout');
      }, 10000);
      
      const response = await fetch('/api/articles', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const articles = await response.json();
      
      // Cache data
      this.setCache('articles', articles);
      
      // Render content
      this.renderContent(articles);
      this.hideLoadingStatus();
      
      console.log('✅ Article data loading completed');
      
    } catch (error) {
      console.error('❌ Loading failed:', error);
      this.showError('Loading failed, please refresh page and try again');
    } finally {
      this.isLoading = false;
    }
  }
  
  renderContent(articles) {
    if (!Array.isArray(articles) || articles.length === 0) {
      this.showError('No articles data available');
      return;
    }
    
    // Process data
    const sortedArticles = [...articles].sort((a, b) => 
      new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()
    );
    
    const featuredArticles = sortedArticles.filter(a => a.featured);
    const mainFeatured = featuredArticles.length > 0 ? featuredArticles[0] : sortedArticles[0];
    
    // Render featured article
    this.renderFeaturedArticle(mainFeatured);
    
    // 🔧 Fix: Filter articles by last 30 days (including future date handling)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const last30DaysArticles = sortedArticles.filter(article => {
      const publishDate = new Date(article.publishDate);
      // Include articles from past 30 days and next 30 days (considering possible future dates in data)
      return publishDate >= thirtyDaysAgo && publishDate <= thirtyDaysLater;
    });
    
    console.log(`📅 Last 30 days filter result: ${last30DaysArticles.length}/${sortedArticles.length}`);
    console.log(`📅 Time range: ${thirtyDaysAgo.toDateString()} to ${thirtyDaysLater.toDateString()}`);
    
    // 🔧 Only show articles from last 30 days, no supplementing with older articles
    const latestArticles = last30DaysArticles.slice(0, 8);
    
    // Render latest articles (truly last 30 days)
    this.renderLatestArticles(latestArticles);
    
    // Render all articles
    this.renderAllArticles(sortedArticles);
    
    // Smooth transition animation
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
      status.innerHTML = `<span style="color: #dc2626;">❌ ${message}</span>`;
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
document.addEventListener('DOMContentLoaded', async () => {
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
});
