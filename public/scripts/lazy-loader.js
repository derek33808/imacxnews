// 🚀 全局懒加载实现
class LazyLoader {
  constructor() {
    this.imageObserver = null;
    this.init();
  }

  init() {
    if ('IntersectionObserver' in window) {
      this.imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target, observer);
          }
        });
      }, {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1
      });

      // 观察已存在的图片
      this.observeExistingImages();
      
      // 观察动态添加的图片
      this.observeDynamicImages();
    } else {
      // 降级处理：直接加载所有图片
      this.loadAllImages();
    }
  }

  observeExistingImages() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      this.imageObserver.observe(img);
    });
  }

  observeDynamicImages() {
    // 监听DOM变化，自动观察新添加的懒加载图片
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 检查添加的节点本身
            if (node.tagName === 'IMG' && node.dataset.src) {
              this.imageObserver.observe(node);
            }
            
            // 检查添加节点的子元素
            const lazyImages = node.querySelectorAll && node.querySelectorAll('img[data-src]');
            if (lazyImages) {
              lazyImages.forEach(img => {
                this.imageObserver.observe(img);
              });
            }
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  loadImage(img, observer) {
    const src = img.dataset.src;
    if (!src) return;

    // 创建临时图片对象进行预加载
    const imageLoader = new Image();
    
    imageLoader.onload = () => {
      // 图片加载成功
      img.src = src;
      img.classList.add('loaded');
      img.removeAttribute('data-src');
      
      // 添加渐入动画
      img.style.opacity = '0';
      requestAnimationFrame(() => {
        img.style.transition = 'opacity 0.3s ease';
        img.style.opacity = '1';
      });
      
      observer.unobserve(img);
    };
    
    imageLoader.onerror = () => {
      // 图片加载失败，使用占位图
      img.src = '/images/placeholder.svg';
      img.classList.add('error');
      img.removeAttribute('data-src');
      observer.unobserve(img);
    };
    
    // 开始加载图片
    imageLoader.src = src;
  }

  loadAllImages() {
    // 降级处理：直接加载所有懒加载图片
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        img.classList.add('loaded');
        img.removeAttribute('data-src');
      }
    });
  }

  // 手动触发特定图片的加载
  loadSpecificImage(selector) {
    const img = document.querySelector(selector);
    if (img && img.dataset.src) {
      this.loadImage(img, { unobserve: () => {} });
    }
  }

  // 预加载指定图片
  preloadImages(urls) {
    urls.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }

  // 清理资源
  destroy() {
    if (this.imageObserver) {
      this.imageObserver.disconnect();
    }
  }
}

// 初始化全局懒加载
document.addEventListener('DOMContentLoaded', () => {
  window.lazyLoader = new LazyLoader();
  
  // 预加载关键图片
  window.lazyLoader.preloadImages([
    '/images/placeholder.svg',
    '/images/fallback/news-placeholder-1.svg',
    '/images/fallback/news-placeholder-2.svg'
  ]);
});

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  if (window.lazyLoader) {
    window.lazyLoader.destroy();
  }
});
