// 图片管理工具函数
export class ImageManager {
  /**
   * 根据文章分类和slug生成标准化的图片路径
   */
  static generateImagePath(category, slug, filename) {
    const categoryPath = category === 'TodayNews' ? 'today-news' : 'past-news';
    const timestamp = Date.now();
    const extension = filename.split('.').pop();
    return `/images/articles/${categoryPath}/${slug}-${timestamp}.${extension}`;
  }

  /**
   * 生成缩略图路径
   */
  static generateThumbnailPath(slug, size = 'medium') {
    return `/images/thumbnails/${size}/${slug}-thumb.webp`;
  }

  /**
   * 验证图片URL是否为外部链接
   */
  static isExternalImage(imageUrl) {
    return imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
  }

  /**
   * 标准化图片路径
   */
  static normalizeImagePath(imagePath) {
    if (this.isExternalImage(imagePath)) {
      return imagePath;
    }
    
    // 确保本地路径以 / 开头
    return imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  }

  /**
   * 生成图片的alt文本
   */
  static generateAltText(title, category) {
    return `${title} - ${category === 'TodayNews' ? '今日新闻' : '往期新闻'}图片`;
  }

  /**
   * 计算文章阅读时间（基于内容长度）
   */
  static calculateReadingTime(content) {
    // 去除HTML标签
    const textContent = content.replace(/<[^>]*>/g, '');
    // 中文按字符计算，英文按单词计算
    const chineseChars = (textContent.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = textContent.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(word => word.length > 0).length;
    
    // 中文阅读速度约300字/分钟，英文约200词/分钟
    const readingTimeMinutes = Math.ceil((chineseChars / 300) + (englishWords / 200));
    return Math.max(1, readingTimeMinutes); // 最少1分钟
  }

  /**
   * 获取内容长度（去除HTML标签后的纯文本长度）
   */
  static getContentLength(content) {
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length;
  }

  /**
   * 生成响应式图片的srcset
   */
  static generateResponsiveImageSrcSet(basePath, slug) {
    return [
      `${this.generateThumbnailPath(slug, 'small')} 150w`,
      `${this.generateThumbnailPath(slug, 'medium')} 300w`,
      `${this.generateThumbnailPath(slug, 'large')} 800w`
    ].join(', ');
  }

  /**
   * 生成图片的完整元数据
   */
  static generateImageMetadata(article) {
    const isExternal = this.isExternalImage(article.image);
    
    return {
      src: this.normalizeImagePath(article.image),
      alt: article.imageAlt || this.generateAltText(article.title, article.category),
      caption: article.imageCaption || '',
      isExternal,
      thumbnails: isExternal ? null : {
        small: this.generateThumbnailPath(article.slug, 'small'),
        medium: this.generateThumbnailPath(article.slug, 'medium'),
        large: this.generateThumbnailPath(article.slug, 'large')
      },
      srcSet: isExternal ? null : this.generateResponsiveImageSrcSet(article.image, article.slug)
    };
  }
}

/**
 * 图片懒加载工具
 */
export class LazyImageLoader {
  static init() {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            img.classList.add('loaded');
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    } else {
      // Fallback for older browsers
      document.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        img.classList.add('loaded');
      });
    }
  }
}

/**
 * 图片性能优化工具
 */
export class ImageOptimizer {
  /**
   * 检查浏览器是否支持WebP格式
   */
  static async supportsWebP() {
    return new Promise(resolve => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * 根据浏览器支持情况选择最佳图片格式
   */
  static async getOptimalImageFormat(originalPath) {
    const supportsWebP = await this.supportsWebP();
    
    if (supportsWebP && !ImageManager.isExternalImage(originalPath)) {
      // 如果支持WebP且是本地图片，尝试使用WebP版本
      const webpPath = originalPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      return webpPath;
    }
    
    return originalPath;
  }
}
