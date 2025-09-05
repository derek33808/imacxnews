export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
import { ImageManager } from '../../../utils/imageUtils.js';

// 🚀 服务端缓存
let articlesCache: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 120000; // 2分钟服务端缓存

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    const limit = parseInt(url.searchParams.get('limit') || '20'); // 默认只加载20篇
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    // 🚀 设置 HTTP 缓存头
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600', // 5分钟缓存，10分钟过期重验证
      'CDN-Cache-Control': 'public, max-age=1800', // CDN 30分钟缓存
    };

    if (slug) {
      const prisma = createDatabaseConnection();
      const article = await withRetry(async () => {
        return await prisma.article.findUnique({ where: { slug } });
      }, `Find article by slug: ${slug}`);
      return new Response(JSON.stringify(article ? [article] : []), { headers });
    }
    
    // 🚀 检查服务端缓存
    const now = Date.now();
    if (articlesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('🚀 Using server-side cache');
      // 应用分页
      const start = offset;
      const end = offset + limit;
      const paginatedArticles = articlesCache.slice(start, end);
      
      return new Response(JSON.stringify({
        articles: paginatedArticles,
        total: articlesCache.length,
        hasMore: end < articlesCache.length,
        fromCache: true
      }), { headers });
    }
    
    const prisma = createDatabaseConnection();
    const articles = await withRetry(async () => {
      return await prisma.article.findMany({ 
        select: {
          id: true,
          title: true,
          author: true,
          category: true,
          image: true,
          publishDate: true,
          featured: true,
          slug: true,
          excerpt: true,
          // Only select fields needed for list display to reduce data transfer
          // content and chineseContent are not needed in list, fetch separately when editing
        },
        orderBy: [
          { featured: 'desc' }, // 特色文章优先
          { publishDate: 'desc' }
        ],
        take: 200 // 服务端缓存更多文章，但客户端分页加载
      });
    }, 'Fetch all articles');
    
    // 🚀 更新服务端缓存
    articlesCache = articles;
    cacheTimestamp = now;
    
    // 应用分页
    const start = offset;
    const end = offset + limit;
    const paginatedArticles = articles.slice(start, end);
    
    return new Response(JSON.stringify({
      articles: paginatedArticles,
      total: articles.length,
      hasMore: end < articles.length,
      fromCache: false
    }), { headers });
    
  } catch (e: any) {
    console.error('数据库错误，无法获取文章:', e?.message);
    return new Response(JSON.stringify({ error: 'Database error', detail: e?.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const prisma = createDatabaseConnection();
    const data = await request.json();

    const slug = String(data.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    let publishDate: Date | undefined;
    if (data.publishDate) {
      const d = new Date(data.publishDate);
      if (Number.isNaN(d.getTime())) return new Response(JSON.stringify({ error: 'Invalid publishDate' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
      publishDate = d;
    }

    // 计算内容统计信息
    const contentLength = ImageManager.getContentLength(data.content);
    const readingTime = ImageManager.calculateReadingTime(data.content);
    const imageAlt = data.imageAlt || ImageManager.generateAltText(data.title, data.category);

    const created = await withRetry(async () => {
      return await prisma.article.create({
        data: {
          title: data.title,
          slug,
          excerpt: data.excerpt,
          content: data.content,
          chineseContent: data.chineseContent ?? null,
          category: data.category,
          image: data.image,
          imageAlt,
          imageCaption: data.imageCaption ?? null,
          author: data.author,
          publishDate: publishDate ?? new Date(),
          featured: Boolean(data.featured),
          contentLength,
          readingTime,
        }
      });
    }, `Create article: ${data.title}`);
    
    return new Response(JSON.stringify(created), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


