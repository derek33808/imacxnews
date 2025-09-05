export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
import { ImageManager } from '../../../utils/imageUtils.js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const prisma = createDatabaseConnection();
    const url = new URL(request.url);
    const slug = url.searchParams.get('slug');
    
    if (slug) {
      const article = await withRetry(async () => {
        return await prisma.article.findUnique({ where: { slug } });
      }, `Find article by slug: ${slug}`);
      return new Response(JSON.stringify(article ? [article] : []), { headers: { 'Content-Type': 'application/json' } });
    }
    
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
        orderBy: { publishDate: 'desc' },
        take: 100 // Limit return count to avoid loading too much data at once
      });
    }, 'Fetch all articles');
    
    return new Response(JSON.stringify(articles), { headers: { 'Content-Type': 'application/json' } });
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


