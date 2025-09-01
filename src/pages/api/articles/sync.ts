export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { initialArticlesData } from '../../../data/articles.js';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
import { ImageManager } from '../../../utils/imageUtils.js';

function toSlug(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export const POST: APIRoute = async ({ request }) => {
  const allowNoAuth = (import.meta as any).env && (import.meta as any).env.PUBLIC_DEV_NOAUTH === 'true';
  if (!allowNoAuth) {
    const user = getUserFromRequest(request);
    try {
      requireRole(user, ['ADMIN']);
    } catch {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  }
  try {
    const items = Array.isArray(initialArticlesData) ? initialArticlesData : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ created: 0, updated: 0 }), { headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`🔄 开始同步 ${items.length} 篇文章到数据库...`);
    
    const prisma = createDatabaseConnection();
    let created = 0;
    let updated = 0;

    // 逐个同步文章，避免长事务超时
    for (const [index, it] of items.entries()) {
      try {
        const slug = (it.slug && typeof it.slug === 'string') ? it.slug : toSlug(it.title);
        const publishDate = it.publishDate ? new Date(it.publishDate) : new Date();
        
        // 计算内容统计信息
        const contentLength = ImageManager.getContentLength(it.content);
        const readingTime = ImageManager.calculateReadingTime(it.content);
        const imageAlt = ImageManager.generateAltText(it.title, it.category);
        
        const data = {
          title: it.title,
          slug,
          excerpt: it.excerpt,
          content: it.content,
          chineseContent: it.chineseContent ?? null,
          category: it.category,
          image: it.image,
          imageAlt,
          imageCaption: it.imageCaption ?? null,
          author: it.author,
          publishDate,
          featured: Boolean(it.featured),
          contentLength,
          readingTime,
        } as const;

        const result = await withRetry(async () => {
          return await prisma.article.upsert({
            where: { slug },
            update: data,
            create: data
          });
        }, `Sync article ${index + 1}/${items.length}: ${it.title}`);

        // 检查结果ID以判断是创建还是更新
        const existingCheck = await withRetry(async () => {
          return await prisma.article.findUnique({ 
            where: { slug },
            select: { id: true, title: true }
          });
        }, `Check existing article: ${it.title}`);

        if (existingCheck && existingCheck.title !== it.title) {
          // 标题不同，说明是覆盖了现有文章
          updated += 1;
          console.log(`🔄 覆盖文章: ${existingCheck.title} -> ${it.title}`);
        } else if (existingCheck) {
          updated += 1;
          console.log(`🔄 更新文章: ${it.title}`);
        } else {
          created += 1;
          console.log(`✅ 创建文章: ${it.title}`);
        }
      } catch (error: any) {
        console.error(`❌ 同步文章失败: ${it.title}`, error.message);
        // 继续处理下一篇文章
      }
    }

    console.log(`🎉 同步完成! 创建: ${created}, 更新: ${updated}`);
    return new Response(JSON.stringify({ 
      created, 
      updated, 
      total: items.length,
      success: true 
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('❌ 同步过程发生错误:', e?.message);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error', 
      detail: e?.message || String(e),
      success: false
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


