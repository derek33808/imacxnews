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
    const isVideo = article.mediaType === 'VIDEO' && article.videoUrl;
    
    // 🎥 Enhanced media rendering with video support
    const mediaContent = isVideo ? this.renderVideoContent(article) : this.renderImageContent(article);
    
    container.innerHTML = `
      <article class="featured-article ${isVideo ? 'featured-video' : 'featured-image'}">
        <div class="featured-media-container">
          ${mediaContent}
          <div class="featured-overlay ${isVideo ? 'video-overlay' : ''}"></div>
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
            ${isVideo && article.videoDuration ? `<span class="featured-duration">${this.formatDuration(article.videoDuration)}</span>` : ''}
          </div>
          
          <a href="/article/${article.slug}" class="featured-read-more btn">
            ${isVideo ? 'Watch Video' : 'Read Full Story'}
          </a>
        </div>
      </article>
    `;
    
    // 🎬 Initialize video controls after DOM insertion
    if (isVideo) {
      setTimeout(() => this.initializeVideoControls(container), 100);
    }
  }
  
  // 🎥 Render video content with controls
  renderVideoContent(article) {
    const videoId = `featured-video-${Date.now()}`;
    const posterUrl = article.image || article.videoPoster || '/images/placeholder.svg';
    
    return `
      <video 
        id="${videoId}"
        class="featured-video-element"
        poster="${posterUrl}"
        preload="metadata"
        width="800" 
        height="450"
        data-video-url="${article.videoUrl}"
        style="width: 100%; height: 100%; object-fit: cover; opacity: 0.9;"
      >
        <source src="${article.videoUrl}" type="video/mp4">
        <source src="${article.videoUrl}" type="video/webm">
        <source src="${article.videoUrl}" type="video/ogg">
        Your browser does not support video playback.
      </video>
      
      <!-- Custom Video Controls -->
      <div class="featured-video-controls" id="controls-${videoId}">
        <!-- Play/Pause Button -->
        <button class="video-play-btn" data-video="${videoId}" aria-label="Play video">
          <svg class="play-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          <svg class="pause-icon" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        </button>
        
        <!-- Fullscreen Button -->
        <button class="video-fullscreen-btn" data-video="${videoId}" aria-label="Toggle fullscreen">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="15,3 21,3 21,9"/>
            <polyline points="9,21 3,21 3,15"/>
            <line x1="21" y1="3" x2="14" y2="10"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </button>
        
        <!-- Progress Bar -->
        <div class="video-progress-container">
          <div class="video-progress-bar">
            <div class="video-progress-fill"></div>
          </div>
        </div>
        
        <!-- Time Display -->
        <div class="video-time-display">
          <span class="video-current-time">0:00</span>
          <span class="video-separator">/</span>
          <span class="video-duration">${article.videoDuration ? this.formatDuration(article.videoDuration) : '0:00'}</span>
        </div>
      </div>
    `;
  }
  
  // 🖼️ Render image content (existing functionality)
  renderImageContent(article) {
    return `
      <img src="${article.image}" alt="${article.title}" class="featured-image" 
           loading="eager" width="800" height="450" 
           onerror="this.onerror=null; this.src='/images/placeholder.svg'; this.classList.add('error');"
           onload="this.style.opacity='1'" 
           style="opacity:0.7; transition: opacity 0.3s ease">
    `;
  }
  
  // 🕒 Format video duration
  formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
  
  // 🎬 Initialize video controls
  initializeVideoControls(container) {
    const videoElement = container.querySelector('.featured-video-element');
    const playBtn = container.querySelector('.video-play-btn');
    const fullscreenBtn = container.querySelector('.video-fullscreen-btn');
    const progressContainer = container.querySelector('.video-progress-container');
    const progressBar = container.querySelector('.video-progress-bar');
    const progressFill = container.querySelector('.video-progress-fill');
    const currentTimeDisplay = container.querySelector('.video-current-time');
    const durationDisplay = container.querySelector('.video-duration');
    const controls = container.querySelector('.featured-video-controls');
    
    if (!videoElement || !playBtn || !fullscreenBtn) return;
    
    // 🎯 Play/Pause functionality
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlayPause(videoElement, playBtn);
    });
    
    // 🔲 Fullscreen functionality
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFullscreen(videoElement);
    });
    
    // 📊 Progress bar functionality
    if (progressBar && progressContainer) {
      progressContainer.addEventListener('click', (e) => {
        this.handleProgressClick(e, videoElement, progressContainer);
      });
    }
    
    // 🎬 Video event listeners
    videoElement.addEventListener('loadedmetadata', () => {
      if (durationDisplay && videoElement.duration) {
        durationDisplay.textContent = this.formatDuration(videoElement.duration);
      }
    });
    
    videoElement.addEventListener('timeupdate', () => {
      this.updateProgress(videoElement, progressFill, currentTimeDisplay);
    });
    
    videoElement.addEventListener('ended', () => {
      this.handleVideoEnd(playBtn);
    });
    
    // 🎭 Show/hide controls on hover
    const featuredArticle = container.querySelector('.featured-article');
    if (featuredArticle && controls) {
      featuredArticle.addEventListener('mouseenter', () => {
        controls.style.opacity = '1';
      });
      
      featuredArticle.addEventListener('mouseleave', () => {
        if (!videoElement.paused) {
          controls.style.opacity = '0';
        }
      });
    }
    
    // 👆 Click to play/pause (anywhere on video)
    videoElement.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePlayPause(videoElement, playBtn);
    });
  }
  
  // 🎯 Toggle play/pause
  togglePlayPause(video, playBtn) {
    const playIcon = playBtn.querySelector('.play-icon');
    const pauseIcon = playBtn.querySelector('.pause-icon');
    
    if (video.paused) {
      video.play();
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      video.pause();
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }
  
  // 🔲 Toggle fullscreen
  toggleFullscreen(video) {
    if (!document.fullscreenElement) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }
  
  // 📊 Handle progress bar click
  handleProgressClick(e, video, progressContainer) {
    const rect = progressContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    const newTime = percentage * video.duration;
    
    if (isFinite(newTime)) {
      video.currentTime = newTime;
    }
  }
  
  // 📈 Update progress bar
  updateProgress(video, progressFill, currentTimeDisplay) {
    if (video.duration) {
      const percentage = (video.currentTime / video.duration) * 100;
      progressFill.style.width = `${percentage}%`;
      
      if (currentTimeDisplay) {
        currentTimeDisplay.textContent = this.formatDuration(video.currentTime);
      }
    }
  }
  
  // 🔚 Handle video end
  handleVideoEnd(playBtn) {
    const playIcon = playBtn.querySelector('.play-icon');
    const pauseIcon = playBtn.querySelector('.pause-icon');
    
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
  }
  
  renderLatestArticles(articles) {
    const container = document.getElementById('latestArticlesGrid');
    if (!container || articles.length === 0) return;
    
    container.innerHTML = articles.map(article => {
      const isVideo = article.mediaType === 'VIDEO' && article.videoUrl;
      const mediaUrl = isVideo ? (article.videoPoster || article.image || '/images/placeholder.svg') : article.image;
      const videoBadge = isVideo ? `<div class="video-badge">📹 VIDEO</div>` : '';
      const videoDuration = isVideo && article.videoDuration ? `<div class="video-duration-badge">${this.formatDuration(article.videoDuration)}</div>` : '';
      
      return `
        <a href="/article/${article.slug}" class="thumb-card overlay ${isVideo ? 'video-card' : ''}">
          <div class="thumb-image-wrap">
            <img src="${mediaUrl}" alt="${article.title}" class="thumb-img"
                 loading="lazy" onerror="this.src='/images/placeholder.svg'">
            ${videoBadge}
            ${videoDuration}
            <div class="thumb-gradient"></div>
            <div class="thumb-text">
              <div class="thumb-title white">${article.title}</div>
              <div class="thumb-date white">Updated ${this.formatDate(article.publishDate)}</div>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }
  
  renderAllArticles(articles) {
    const container = document.getElementById('allArticlesList');
    if (!container || articles.length === 0) return;
    
    container.innerHTML = articles.map(article => {
      const isVideo = article.mediaType === 'VIDEO' && article.videoUrl;
      const mediaUrl = isVideo ? (article.videoPoster || article.image || '/images/placeholder.svg') : article.image;
      const videoBadge = isVideo ? `<span class="video-indicator">📹</span>` : '';
      const videoDuration = isVideo && article.videoDuration ? `<span class="duration-text">${this.formatDuration(article.videoDuration)}</span>` : '';
      
      return `
        <a href="/article/${article.slug}" class="index-row ${isVideo ? 'video-row' : ''}">
          <img src="${mediaUrl}" alt="${article.title}" class="index-thumb"
               loading="lazy" onerror="this.src='/images/placeholder.svg'">
          <div class="index-meta">
            <div class="index-title">${article.title} ${videoBadge}</div>
            <div class="index-sub">${this.formatDate(article.publishDate)} ${videoDuration}</div>
          </div>
        </a>
      `;
    }).join('');
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

  // Listen for custom events from admin panel to refresh homepage lists
  window.addEventListener('articlePublished', () => {
    console.log('🆕 Article published, refreshing homepage lists');
    loader.cache.clear();
    loader.loadArticles(0, false);
  });
  window.addEventListener('articleDeleted', () => {
    console.log('🗑️ Article deleted, refreshing homepage lists');
    loader.cache.clear();
    loader.loadArticles(0, false);
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
