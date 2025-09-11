// 获取上传限制API
export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Get file size limits with Netlify Functions constraint
    const maxImageSize = parseInt(import.meta.env.MAX_IMAGE_SIZE || '10485760'); // 10MB
    // Netlify Functions 有 ~10MB 请求体限制，所以生产环境设置为8MB以确保安全
    const defaultVideoSize = import.meta.env.MODE === 'production' ? '8388608' : '52428800'; // 8MB in production, 50MB in development
    const maxVideoSize = parseInt(import.meta.env.MAX_VIDEO_SIZE || defaultVideoSize);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        maxImageSize: maxImageSize,
        maxVideoSize: maxVideoSize,
        maxImageSizeMB: Math.round(maxImageSize / 1024 / 1024),
        maxVideoSizeMB: Math.round(maxVideoSize / 1024 / 1024),
        environment: import.meta.env.MODE,
        supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        supportedVideoFormats: ['mp4', 'webm', 'ogg', 'mov'],
        videoEnabled: import.meta.env.ENABLE_VIDEO_NEWS !== 'false'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Failed to get upload limits:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get upload limits',
      detail: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
