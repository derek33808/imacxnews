const CACHE_NAME = 'imacx-images-v1';
const IMAGE_CACHE_NAME = 'imacx-images-cache-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/images/placeholder.svg',
  '/images/fallback/news-placeholder-1.svg',
  '/images/fallback/news-placeholder-2.svg'
];

// 安装事件 - 缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
            console.log('🗑️ 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求 - 实现图片缓存策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 只处理图片请求
  if (event.request.destination === 'image' || 
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        // 先尝试从缓存获取
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          console.log('🖼️ 从缓存加载图片:', url.pathname);
          
          // 后台更新缓存（stale-while-revalidate策略）
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
          }).catch(() => {}); // 忽略网络错误
          
          return cachedResponse;
        }
        
        // 缓存中没有，从网络获取
        try {
          console.log('📡 从网络加载图片:', url.pathname);
          const networkResponse = await fetch(event.request);
          
          if (networkResponse && networkResponse.status === 200) {
            // 缓存成功的响应
            const responseToCache = networkResponse.clone();
            cache.put(event.request, responseToCache);
          }
          
          return networkResponse;
        } catch (error) {
          // 静默处理图片加载失败，避免控制台噪音
          console.warn('图片加载失败，尝试使用占位图:', url.pathname);
          
          // 返回占位图
          if (url.pathname.includes('/images/')) {
            const placeholderResponse = await caches.match('/images/placeholder.svg');
            if (placeholderResponse) {
              return placeholderResponse;
            }
          }
          
          // 如果占位图也不可用，返回简单的响应而不是抛出错误
          return new Response('', { status: 404, statusText: 'Image Not Found' });
        }
      })
    );
  }
});

// 消息处理 - 支持手动缓存清理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
    caches.delete(IMAGE_CACHE_NAME).then(() => {
      console.log('🗑️ 图片缓存已清理');
      event.ports[0].postMessage({ success: true });
    });
  }
});