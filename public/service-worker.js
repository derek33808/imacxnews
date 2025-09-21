const CACHE_NAME = 'imacx-static-v2';
const IMAGE_CACHE_NAME = 'imacx-images-v2';
const API_CACHE_NAME = 'imacx-api-v2';

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
            // console.log('🗑️ 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求 - 实现缓存策略
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 🚀 API 缓存策略 (缓存优先，后台更新)
  if (url.pathname.startsWith('/api/articles')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          
          // 后台更新缓存 (stale-while-revalidate)
          fetch(event.request).then(response => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
          }).catch(() => {}); // 静默处理网络错误
          
          return cachedResponse;
        }
        
        // 缓存中没有，从网络获取
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          console.warn('API请求失败:', url.pathname);
          // 返回空数组而不是错误，防止页面崩溃
          return new Response(JSON.stringify({ articles: [], total: 0, hasMore: false }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }
  
  // 图片缓存策略
  if (event.request.destination === 'image' || 
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        // 先尝试从缓存获取
        const cachedResponse = await cache.match(event.request);
        
        if (cachedResponse) {
          
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
          const networkResponse = await fetch(event.request);
          
          if (networkResponse && networkResponse.status === 200) {
            // 缓存成功的响应
            const responseToCache = networkResponse.clone();
            cache.put(event.request, responseToCache);
          }
          
          return networkResponse;
        } catch (error) {
          // 静默处理图片加载失败，避免控制台噪音
          
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
      // console.log('🗑️ 图片缓存已清理');
      event.ports[0].postMessage({ success: true });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_ALL_CACHE') {
    Promise.all([
      caches.delete(IMAGE_CACHE_NAME),
      caches.delete(API_CACHE_NAME),
      caches.delete(CACHE_NAME)
    ]).then(() => {
      // console.log('🗑️ 所有缓存已清理');
      event.ports[0].postMessage({ success: true });
    });
  }
});