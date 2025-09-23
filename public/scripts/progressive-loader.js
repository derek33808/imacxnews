// 🚀 Enhanced Progressive Loading Manager - 性能优化版本
class ProgressiveLoader {
  constructor() {
    this.isLoading = false;
    this.cache = new Map();
    this.cacheExpiry = 60000; // 1分钟缓存
    this.currentPage = 0;
    this.pageSize = 10;
    this.allArticles = [];
    this.hasMore = true;
    this.totalArticles = 0;
    this.totalPages = 0;
    this.allArticlesCache = null;
    this.performanceMode = true; // 🚀 启用性能模式，减少复杂处理
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
    this.totalArticles = data.total || articles.length;
    this.totalPages = Math.ceil(this.totalArticles / this.pageSize);
    
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
    this.updatePaginationUI();
  }

  // 🚀 加载所有文章用于分页显示
  async loadAllArticlesForPagination() {
    if (this.allArticlesCache) {
      return this.allArticlesCache;
    }

    try {
      const response = await fetch('/api/articles?limit=200&offset=0');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const articles = data.articles || (Array.isArray(data) ? data : []);
      
      this.allArticlesCache = articles;
      this.totalArticles = articles.length;
      this.totalPages = Math.ceil(this.totalArticles / this.pageSize);
      
      return articles;
    } catch (error) {
      console.error('Failed to load all articles:', error);
      return [];
    }
  }

  // 🚀 加载指定页面的文章 - 增强版带视觉反馈
  async loadArticlePage(pageNumber) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoadingStatus('Loading page...');
    
    // 🎭 添加加载状态的视觉反馈
    const paginationContainer = document.getElementById('paginationContainer');
    if (paginationContainer) {
      paginationContainer.classList.add('loading');
    }
    
    try {
      const allArticles = await this.loadAllArticlesForPagination();
      const startIndex = pageNumber * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      const pageArticles = allArticles.slice(startIndex, endIndex);
      
      // 🎨 添加轻微延迟以显示加载动画效果（仅在快速操作时）
      const minLoadingTime = 300;
      const startTime = Date.now();
      
      // 更新"All Articles"部分
      this.renderAllArticlesList(pageArticles);
      this.currentPage = pageNumber;
      this.updatePaginationUI();
      
      // 确保最小加载时间以展示动画
      const elapsed = Date.now() - startTime;
      if (elapsed < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
      }
      
      // 滚动到文章列表顶部
      const allArticlesSection = document.getElementById('allArticlesSection');
      if (allArticlesSection) {
        allArticlesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
    } catch (error) {
      console.error('Failed to load page:', error);
      this.showError(`Failed to load page ${pageNumber + 1}`);
    } finally {
      this.isLoading = false;
      this.hideLoadingStatus();
      
      // 🎭 移除加载状态
      if (paginationContainer) {
        paginationContainer.classList.remove('loading');
      }
    }
  }

  // 🚀 更新分页UI
  updatePaginationUI() {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (!paginationContainer || this.totalPages <= 1) {
      if (paginationContainer) paginationContainer.style.display = 'none';
      return;
    }
    
    paginationContainer.style.display = 'block';
    
    // 更新分页信息
    if (paginationInfo) {
      paginationInfo.textContent = `Page ${this.currentPage + 1} of ${this.totalPages} (${this.totalArticles} articles)`;
    }
    
    // Update previous/next buttons
    if (prevBtn) {
      prevBtn.disabled = this.currentPage === 0;
      prevBtn.onclick = () => {
        if (this.currentPage > 0) {
          this.loadArticlePage(this.currentPage - 1);
        }
      };
    }
    
    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= this.totalPages - 1;
      nextBtn.onclick = () => {
        if (this.currentPage < this.totalPages - 1) {
          this.loadArticlePage(this.currentPage + 1);
        }
      };
    }
    
    // 生成页码
    if (pageNumbers) {
      pageNumbers.innerHTML = this.generatePageNumbers();
    }
  }

  // 🚀 生成页码HTML
  generatePageNumbers() {
    const pages = [];
    const current = this.currentPage;
    const total = this.totalPages;
    
    if (total <= 7) {
      // 如果总页数<=7，显示所有页码
      for (let i = 0; i < total; i++) {
        pages.push(this.createPageButton(i, i === current));
      }
    } else {
      // 复杂分页逻辑
      pages.push(this.createPageButton(0, current === 0)); // First page
      
      if (current > 2) {
        pages.push('<span class="page-ellipsis">...</span>');
      }
      
      // 当前页周围的页码
      const start = Math.max(1, current - 1);
      const end = Math.min(total - 2, current + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(this.createPageButton(i, i === current));
      }
      
      if (current < total - 3) {
        pages.push('<span class="page-ellipsis">...</span>');
      }
      
      pages.push(this.createPageButton(total - 1, current === total - 1)); // Last page
    }
    
    return pages.join('');
  }

  // 🚀 创建页码按钮 - 新的现代化设计
  createPageButton(pageNumber, isActive) {
    const className = isActive ? 'page-number active' : 'page-number';
    return `<button class="${className}" onclick="progressiveLoader.loadArticlePage(${pageNumber})"><span>${pageNumber + 1}</span></button>`;
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
    
    // 🚀 Only show the latest 8 articles to reduce initial rendering load
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
    const isVideo = article.mediaType === 'VIDEO';
    const hasVideoUrl = article.videoUrl && article.videoUrl.trim() !== '';
    
    // 🐛 调试日志：检查特色文章数据
    console.log(`🌟 Featured Article "${article.title}": mediaType="${article.mediaType}", hasVideoUrl=${hasVideoUrl}, videoUrl="${article.videoUrl}"`);
    console.log(`🔗 Video controls will be ${(isVideo && hasVideoUrl) ? 'enabled' : 'disabled'} for this article`);
    
    // 🎥 Enhanced media rendering with video support
    const mediaContent = isVideo ? this.renderVideoContent(article) : this.renderImageContent(article);
    
    container.innerHTML = `
      <article class="featured-article ${isVideo ? 'featured-video' : 'featured-image'}">
        <div class="featured-media-container">
          ${mediaContent}
          ${isVideo && this.isEmbeddableVideo(article.videoUrl) ? '' : `<div class="featured-overlay ${isVideo ? 'video-overlay' : ''}"></div>`}
        </div>
        
        <div class="featured-content" style="pointer-events: auto; position: relative; z-index: 3;">
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
    
    // 🎬 Initialize video controls after DOM insertion (只有在有实际视频URL时才初始化控件)
    if (isVideo && hasVideoUrl) {
      const isEmbeddable = this.isEmbeddableVideo(article.videoUrl);
      if (!isEmbeddable) {
        // Only initialize controls for direct video files (not YouTube/Vimeo iframes)
        setTimeout(() => this.initializeVideoControls(container), 100);
        console.log(`✅ Direct video controls initialized for: ${article.title}`);
      } else {
        // For YouTube/Vimeo videos, ensure iframe is clickable and interactive
        console.log(`✅ YouTube/Vimeo video ready for playback: ${article.title}`);
        console.log(`🔗 Embed URL: ${this.convertToEmbedUrl(article.videoUrl)}`);
      }
    }
  }
  
  // 🎥 Render video content with controls (supports YouTube, Vimeo, and direct video)
  renderVideoContent(article) {
    const videoId = `featured-video-${Date.now()}`;
    const posterUrl = article.image || article.videoPoster || '/images/placeholder.svg';
    const videoUrl = article.videoUrl;
    
    // 🎬 Check if this is a YouTube or Vimeo URL
    const isYouTubeOrVimeo = this.isEmbeddableVideo(videoUrl);
    const embedUrl = isYouTubeOrVimeo ? this.convertToEmbedUrl(videoUrl) : null;
    
    if (isYouTubeOrVimeo && embedUrl) {
      // 🎥 Render YouTube/Vimeo as iframe
      return `
        <div class="featured-video-iframe-container" style="position: relative; width: 100%; height: 100%; background: #000; z-index: 1;">
          <iframe 
            id="${videoId}"
            class="featured-video-iframe"
            src="${embedUrl}"
            width="100%" 
            height="100%"
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; cursor: pointer; z-index: 2;"
            frameborder="0"
            allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            title="Video Player"
          ></iframe>
          ${article.videoDuration ? `
            <div class="featured-video-duration-badge-top-right" style="position: absolute; top: 20px; right: 20px; background: rgba(0, 0, 0, 0.8); border: 2px solid white; color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.875rem; font-weight: 700; z-index: 3; display: flex; align-items: center; gap: 4px; backdrop-filter: blur(10px); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); letter-spacing: 0.5px; text-transform: uppercase;">
              ${this.formatDuration(article.videoDuration)}
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // 🎥 Render direct video file as HTML5 video
      return `
        <video 
          id="${videoId}"
          class="featured-video-element"
          poster="${posterUrl}"
          preload="metadata"
          playsinline
          muted
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
  }
  
  // 🎬 Check if URL is embeddable (YouTube, Vimeo)
  isEmbeddableVideo(url) {
    if (!url) return false;
    const hostname = new URL(url.includes('http') ? url : 'https://' + url).hostname.toLowerCase();
    return hostname.includes('youtube.com') || hostname.includes('youtu.be') || hostname.includes('vimeo.com');
  }
  
  // 🎬 Convert regular video URLs to embed format
  convertToEmbedUrl(url) {
    try {
      let videoUrl = url.trim();
      if (!videoUrl.match(/^https?:\/\//)) {
        videoUrl = 'https://' + videoUrl;
      }
      
      const parsedUrl = new URL(videoUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      // YouTube URLs
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        let videoId;
        
        if (hostname.includes('youtu.be')) {
          videoId = parsedUrl.pathname.slice(1);
        } else if (parsedUrl.searchParams.has('v')) {
          videoId = parsedUrl.searchParams.get('v');
        } else {
          const match = parsedUrl.pathname.match(/\/embed\/([^/?]+)/);
          if (match) videoId = match[1];
        }
        
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      }
      
      // Vimeo URLs
      if (hostname.includes('vimeo.com')) {
        const match = parsedUrl.pathname.match(/\/(\d+)/);
        if (match) {
          return `https://player.vimeo.com/video/${match[1]}`;
        }
      }
      
      return url; // Return original if conversion fails
    } catch (error) {
      console.warn('Failed to convert video URL:', error);
      return url;
    }
  }

  // 🎬 Extract YouTube video ID from URL
  getYouTubeVideoId(url) {
    try {
      let videoUrl = url.trim();
      if (!videoUrl.match(/^https?:\/\//)) {
        videoUrl = 'https://' + videoUrl;
      }
      
      const parsedUrl = new URL(videoUrl);
      const hostname = parsedUrl.hostname.toLowerCase();
      
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        let videoId;
        
        if (hostname.includes('youtu.be')) {
          videoId = parsedUrl.pathname.slice(1);
        } else if (parsedUrl.searchParams.has('v')) {
          videoId = parsedUrl.searchParams.get('v');
        } else {
          const match = parsedUrl.pathname.match(/\/embed\/([^/?]+)/);
          if (match) videoId = match[1];
        }
        
        return videoId;
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to extract YouTube video ID:', error);
      return null;
    }
  }

  // 🎬 Get YouTube thumbnail URL
  getYouTubeThumbnail(url, quality = 'maxresdefault') {
    const videoId = this.getYouTubeVideoId(url);
    if (!videoId) return null;
    
    // YouTube缩略图质量选项:
    // maxresdefault: 1280x720 (最高质量)
    // hqdefault: 480x360 (高质量)
    // mqdefault: 320x180 (中等质量)
    // default: 120x90 (默认质量)
    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
  }

  // 🎬 Generate video thumbnail from first frame
  async generateVideoThumbnail(videoUrl, width = 320, height = 180) {
    return new Promise((resolve) => {
      try {
        console.log(`🎬 Starting homepage thumbnail generation for: ${videoUrl}`);
        
        // Create video element
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        video.style.display = 'none';
        
        // Add to DOM temporarily (some browsers require this)
        document.body.appendChild(video);
        
        let isResolved = false;
        
        const cleanup = () => {
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
        };
        
        const resolveOnce = (result) => {
          if (!isResolved) {
            isResolved = true;
            cleanup();
            resolve(result);
          }
        };
        
        video.onloadedmetadata = () => {
          console.log(`🎬 Homepage video metadata loaded, duration: ${video.duration}s`);
          // Try multiple time points to avoid black frames
          const timePoints = [1, 0.5, 2, 0.1];
          let currentAttempt = 0;
          
          const tryNextTimePoint = () => {
            if (currentAttempt < timePoints.length) {
              const timePoint = Math.min(timePoints[currentAttempt], video.duration - 0.1);
              console.log(`🎬 Homepage attempting thumbnail at ${timePoint}s`);
              video.currentTime = timePoint;
              currentAttempt++;
            } else {
              console.warn('❌ Homepage: All time points failed');
              resolveOnce(null);
            }
          };
          
          tryNextTimePoint();
        };
        
        video.onseeked = () => {
          try {
            console.log(`🎬 Homepage video seeked to ${video.currentTime}s, generating thumbnail...`);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.warn('❌ Homepage: Cannot get canvas context');
              resolveOnce(null);
              return;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw video frame to canvas
            ctx.drawImage(video, 0, 0, width, height);
            
            // Check if the frame is not completely black
            const imageData = ctx.getImageData(0, 0, width, height);
            const pixels = imageData.data;
            let totalBrightness = 0;
            
            for (let i = 0; i < pixels.length; i += 4) {
              totalBrightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            }
            
            const averageBrightness = totalBrightness / (pixels.length / 4);
            console.log(`🎬 Homepage frame brightness: ${averageBrightness}`);
            
            if (averageBrightness < 10) {
              // Frame is too dark, try next time point
              console.warn('⚠️ Homepage frame too dark, trying next time point');
              if (video.currentTime < video.duration - 1) {
                video.currentTime = Math.min(video.currentTime + 1, video.duration - 0.1);
                return;
              }
            }
            
            // Convert to data URL
            const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
            console.log(`✅ Homepage thumbnail generated successfully (${thumbnailUrl.length} bytes)`);
            resolveOnce(thumbnailUrl);
            
          } catch (error) {
            console.warn('❌ Homepage failed to generate video thumbnail:', error);
            resolveOnce(null);
          }
        };
        
        video.onerror = (e) => {
          console.warn('❌ Homepage video loading error:', e);
          resolveOnce(null);
        };
        
        video.onabort = () => {
          console.warn('❌ Homepage video loading aborted');
          resolveOnce(null);
        };
        
        // Set video source and load
        video.src = videoUrl;
        video.load();
        
        // Timeout fallback
        setTimeout(() => {
          console.warn('⏰ Homepage thumbnail generation timeout');
          resolveOnce(null);
        }, 10000); // 10 second timeout
        
      } catch (error) {
        console.warn('❌ Homepage video thumbnail generation error:', error);
        resolve(null);
      }
    });
  }

  // 🎬 Get optimized media URL for videos
  async getOptimizedMediaUrl(article) {
    const isVideo = article.mediaType === 'VIDEO';
    
    if (!isVideo) {
      return article.image;
    }
    
    // For YouTube videos, use YouTube thumbnail
    if (this.isEmbeddableVideo(article.videoUrl)) {
      const youtubeThumbnail = this.getYouTubeThumbnail(article.videoUrl);
      return youtubeThumbnail || article.videoPoster || article.image || '/images/placeholder.svg';
    }
    
    // For direct video files, try to generate thumbnail if no poster exists
    if (!article.videoPoster && !article.image && article.videoUrl) {
      console.log(`🎬 Generating thumbnail for video: ${article.title}`);
      const generatedThumbnail = await this.generateVideoThumbnail(article.videoUrl);
      if (generatedThumbnail) {
        console.log(`✅ Generated thumbnail for: ${article.title}`);
        return generatedThumbnail;
      }
    }
    
    // Fallback to existing logic
    return article.videoPoster || article.image || '/images/placeholder.svg';
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
    
    console.log('🎮 Initializing video controls:', {
      videoElement: !!videoElement,
      playBtn: !!playBtn,
      fullscreenBtn: !!fullscreenBtn,
      controls: !!controls
    });
    
    if (!videoElement || !playBtn || !fullscreenBtn) {
      console.error('❌ Missing video control elements:', {
        videoElement: !!videoElement,
        playBtn: !!playBtn,
        fullscreenBtn: !!fullscreenBtn
      });
      return;
    }
    
    // 🎯 Play/Pause functionality
    playBtn.addEventListener('click', (e) => {
      console.log('🎯 Play button clicked!');
      e.preventDefault();
      e.stopPropagation();
      this.togglePlayPause(videoElement, playBtn);
    });
    
    // 🎯 Additional event listeners for debugging
    playBtn.addEventListener('mousedown', (e) => {
      console.log('🖱️ Play button mousedown');
      e.preventDefault();
    });
    
    playBtn.addEventListener('mouseup', (e) => {
      console.log('🖱️ Play button mouseup');
      e.preventDefault();
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
      e.preventDefault();
      e.stopPropagation();
      this.togglePlayPause(videoElement, playBtn);
    });
  }
  
  // 🎯 Toggle play/pause
  togglePlayPause(video, playBtn) {
    console.log('🎬 togglePlayPause called, video paused:', video.paused);
    const playIcon = playBtn.querySelector('.play-icon');
    const pauseIcon = playBtn.querySelector('.pause-icon');
    
    try {
      if (video.paused) {
        console.log('▶️ Playing video...');
        video.play().then(() => {
          console.log('✅ Video play successful');
          playIcon.style.display = 'none';
          pauseIcon.style.display = 'block';
        }).catch(error => {
          console.error('❌ Video play failed:', error);
        });
      } else {
        console.log('⏸️ Pausing video...');
        video.pause();
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
      }
    } catch (error) {
      console.error('❌ Toggle play/pause error:', error);
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
    
    container.innerHTML = articles.map((article, index) => {
      // 🎬 修复视频判断条件：只需要 mediaType === 'VIDEO' 即可显示视频标识
      const isVideo = article.mediaType === 'VIDEO';
      const hasVideoUrl = article.videoUrl && article.videoUrl.trim() !== '';
      
      // 🐛 调试日志：检查文章数据
      console.log(`📹 Article "${article.title}": mediaType="${article.mediaType}", hasVideoUrl=${hasVideoUrl}, videoUrl="${article.videoUrl}"`);
      
      // 🎬 智能获取媒体URL - 优先使用YouTube缩略图
      let mediaUrl;
      const needsVideoThumbnail = isVideo && !this.isEmbeddableVideo(article.videoUrl) && !article.videoPoster && !article.image;
      
      if (isVideo) {
        // 对于YouTube视频，尝试获取YouTube缩略图
        if (this.isEmbeddableVideo(article.videoUrl)) {
          const youtubeThumbnail = this.getYouTubeThumbnail(article.videoUrl);
          mediaUrl = youtubeThumbnail || article.videoPoster || article.image || '/images/placeholder.svg';
          console.log(`🎬 YouTube thumbnail for "${article.title}": ${youtubeThumbnail}`);
        } else {
          // 直接视频文件使用原有逻辑，但标记需要生成缩略图
          mediaUrl = article.videoPoster || article.image || '/images/placeholder.svg';
        }
      } else {
        mediaUrl = article.image;
      }
      
      // 🎬 异步生成视频缩略图（性能模式下跳过）
      if (!this.performanceMode && needsVideoThumbnail && hasVideoUrl) {
        setTimeout(async () => {
          try {
            const generatedThumbnail = await this.generateVideoThumbnail(article.videoUrl);
            if (generatedThumbnail) {
              const imgElement = container.querySelector(`img[data-article-id="${article.id}"]`);
              if (imgElement) {
                imgElement.src = generatedThumbnail;
                console.log(`✅ Updated thumbnail for: ${article.title}`);
              }
            }
          } catch (error) {
            console.warn(`Failed to generate thumbnail for ${article.title}:`, error);
          }
        }, index * 200);
      }
      
      // 🎯 改进视频标识：纯白色样式
      const videoBadge = isVideo ? `
        <div class="video-badge enhanced">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: white;">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
          <span style="color: white;">VIDEO</span>
        </div>` : '';
      
      const videoDuration = isVideo && article.videoDuration ? `<div class="video-duration-badge">${this.formatDuration(article.videoDuration)}</div>` : '';
      
      return `
        <a href="/article/${article.slug}" class="thumb-card overlay ${isVideo ? 'video-card' : ''}">
          <div class="thumb-image-wrap">
            <img src="${mediaUrl}" alt="${article.title}" class="thumb-img"
                 data-article-id="${article.id}"
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
    
    container.innerHTML = articles.map((article, index) => {
      // 🎬 修复视频判断条件：只需要 mediaType === 'VIDEO' 即可显示视频标识
      const isVideo = article.mediaType === 'VIDEO';
      const hasVideoUrl = article.videoUrl && article.videoUrl.trim() !== '';
      
      // 🐛 调试日志：检查文章数据（仅在首次渲染时显示，避免日志过多）
      if (this.currentPage === 0) {
        console.log(`📋 List Article "${article.title}": mediaType="${article.mediaType}", hasVideoUrl=${hasVideoUrl}`);
      }
      
      // 🎬 智能获取媒体URL - 优先使用YouTube缩略图
      let mediaUrl;
      const needsVideoThumbnail = isVideo && !this.isEmbeddableVideo(article.videoUrl) && !article.videoPoster && !article.image;
      
      if (isVideo) {
        // 对于YouTube视频，尝试获取YouTube缩略图
        if (this.isEmbeddableVideo(article.videoUrl)) {
          const youtubeThumbnail = this.getYouTubeThumbnail(article.videoUrl);
          mediaUrl = youtubeThumbnail || article.videoPoster || article.image || '/images/placeholder.svg';
        } else {
          // 直接视频文件使用原有逻辑
          mediaUrl = article.videoPoster || article.image || '/images/placeholder.svg';
        }
      } else {
        mediaUrl = article.image;
      }
      
      // 🎬 异步生成视频缩略图（性能模式下跳过）
      if (!this.performanceMode && needsVideoThumbnail && hasVideoUrl) {
        setTimeout(async () => {
          try {
            const generatedThumbnail = await this.generateVideoThumbnail(article.videoUrl);
            if (generatedThumbnail) {
              const imgElement = container.querySelector(`img[data-article-id="${article.id}"]`);
              if (imgElement) {
                imgElement.src = generatedThumbnail;
                console.log(`✅ Updated list thumbnail for: ${article.title}`);
              }
            }
          } catch (error) {
            console.warn(`Failed to generate list thumbnail for ${article.title}:`, error);
          }
        }, index * 100);
      }
      
      // 🎯 改进视频标识：更明显的内联视频图标
      const videoBadge = isVideo ? `
        <span class="video-indicator enhanced">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </span>` : '';
      
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

  // 🚀 专门用于分页的文章列表渲染方法
  renderAllArticlesList(articles) {
    const container = document.getElementById('allArticlesList');
    if (!container) {
      console.error('All articles container not found');
      return;
    }
    
    if (!Array.isArray(articles) || articles.length === 0) {
      container.innerHTML = '<div class="no-articles">No articles on this page</div>';
      return;
    }
    
    container.innerHTML = articles.map((article, index) => {
      // 🎬 修复视频判断条件：只需要 mediaType === 'VIDEO' 即可显示视频标识
      const isVideo = article.mediaType === 'VIDEO';
      const hasVideoUrl = article.videoUrl && article.videoUrl.trim() !== '';
      
      // 🎬 智能获取媒体URL - 优先使用YouTube缩略图
      let mediaUrl;
      const needsVideoThumbnail = isVideo && !this.isEmbeddableVideo(article.videoUrl) && !article.videoPoster && !article.image;
      
      if (isVideo) {
        // 对于YouTube视频，尝试获取YouTube缩略图
        if (this.isEmbeddableVideo(article.videoUrl)) {
          const youtubeThumbnail = this.getYouTubeThumbnail(article.videoUrl);
          mediaUrl = youtubeThumbnail || article.videoPoster || article.image || '/images/placeholder.svg';
        } else {
          // 直接视频文件使用原有逻辑
          mediaUrl = article.videoPoster || article.image || '/images/placeholder.svg';
        }
      } else {
        mediaUrl = article.image;
      }
      
      // 🎬 异步生成视频缩略图（性能模式下跳过）
      if (!this.performanceMode && needsVideoThumbnail && hasVideoUrl) {
        setTimeout(async () => {
          try {
            const generatedThumbnail = await this.generateVideoThumbnail(article.videoUrl, 56, 56);
            if (generatedThumbnail) {
              const imgElement = container.querySelector(`img[data-article-id="${article.id}"]`);
              if (imgElement) {
                imgElement.src = generatedThumbnail;
                console.log(`✅ Updated paginated thumbnail for: ${article.title}`);
              }
            }
          } catch (error) {
            console.warn(`Failed to generate paginated thumbnail for ${article.title}:`, error);
          }
        }, index * 50);
      }
      
      // 🎯 改进视频标识：更明显的内联视频图标
      const videoBadge = isVideo ? `
        <span class="video-indicator enhanced">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </span>` : '';
      
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
    
    console.log(`✅ Page ${this.currentPage + 1} articles rendered successfully (${articles.length} articles)`);
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
  
  // 🚀 添加全局引用以便分页按钮调用
  window.progressiveLoader = loader;
  
  // Start loading immediately
  await loader.loadArticles();
  
  // Set up other event listeners...
  const toggleBtn = document.getElementById('toggleAllArticlesBtn');
  const allSection = document.getElementById('allArticlesSection');
  
  if (toggleBtn && allSection) {
    toggleBtn.addEventListener('click', async () => {
      const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', (!expanded).toString());
      allSection.setAttribute('aria-hidden', expanded.toString());
      
      if (expanded) {
        allSection.classList.add('is-collapsed');
        allSection.classList.remove('is-expanded');
      } else {
        allSection.classList.remove('is-collapsed');
        allSection.classList.add('is-expanded');
        
        // 🚀 首次展开时，启用分页功能
        if (!loader.allArticlesCache) {
          await loader.loadArticlePage(0);
        }
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
