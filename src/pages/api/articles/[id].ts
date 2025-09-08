export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const url = new URL(request.url);
    const forceRefresh = url.searchParams.get('_force') === 'true';
    const syncRequest = url.searchParams.get('_sync') === 'true';
    
    // 🚀 Dynamic cache headers based on request type
    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (forceRefresh || syncRequest) {
      headers = {
        ...headers,
        'Cache-Control': 'no-cache, no-store, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Cache-Status': 'force-refresh'
      };
    } else {
      headers = {
        ...headers,
        'Cache-Control': 'public, max-age=300',
        'X-Cache-Status': 'cacheable'
      };
    }
    
    const prisma = createDatabaseConnection();
    const id = Number(params.id);
    
    const a = await withRetry(async () => {
      return await prisma.article.findUnique({ where: { id } });
    }, `Find article by ID: ${id}`);
    
    return a ? new Response(JSON.stringify(a), { headers }) : new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const prisma = createDatabaseConnection();
    const id = Number(params.id);
    const data = await request.json();

    const updates: any = { ...data };
    if (data.title) {
      updates.slug = String(data.title)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
    if (data.publishDate) {
      const d = new Date(data.publishDate);
      if (Number.isNaN(d.getTime())) return new Response(JSON.stringify({ error: 'Invalid publishDate' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
      updates.publishDate = d;
    }

    const upd = await prisma.article.update({ where: { id }, data: updates });
    
    // 🚀 Enhanced cache invalidation with version control for Cache Sync Manager
    const now = Date.now();
    const GLOBAL: any = globalThis as any;
    if (GLOBAL.__articles_cache) {
      GLOBAL.__articles_cache.data = null;
      GLOBAL.__articles_cache.timestamp = 0;
      GLOBAL.__articles_cache.version = (GLOBAL.__articles_cache.version || 0) + 1;
    }

    console.log(`✏️ Article ${id} updated - Cache version updated to ${GLOBAL.__articles_cache?.version || 0}`);

    // Add metadata to response for Cache Sync Manager
    const responseData = {
      ...upd,
      cacheVersion: GLOBAL.__articles_cache?.version || 0,
      invalidationTimestamp: now,
      operation: 'UPDATE'
    };

    return new Response(JSON.stringify(responseData), { 
      headers: { 
        'Content-Type': 'application/json',
        'X-Cache-Invalidated': 'true',
        'X-Cache-Version': (GLOBAL.__articles_cache?.version || 0).toString(),
        'X-Operation': 'UPDATE',
        'X-Invalidation-Timestamp': now.toString(),
        'X-Article-Id': id.toString()
      } 
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    // 数据库被禁用时直接返回清晰提示
    if ((import.meta as any).env && (import.meta as any).env.DISABLE_DATABASE === 'true') {
      return new Response(
        JSON.stringify({ error: 'Database disabled in preview mode, delete is unavailable.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const prisma = createDatabaseConnection();
    const id = Number(params.id);
    // 使用统一的重试封装，提高临时性故障的鲁棒性
    await withRetry(async () => {
      await prisma.article.delete({ where: { id } });
      return null as any;
    }, `Delete article: ${id}`);

    // 🚀 Enhanced cache invalidation with version control for Cache Sync Manager
    const now = Date.now();
    const GLOBAL: any = globalThis as any;
    if (GLOBAL.__articles_cache) {
      GLOBAL.__articles_cache.data = null;
      GLOBAL.__articles_cache.timestamp = 0;
      GLOBAL.__articles_cache.version = (GLOBAL.__articles_cache.version || 0) + 1;
    }

    console.log(`🗑️ Article ${id} deleted - Cache version updated to ${GLOBAL.__articles_cache?.version || 0}`);

    return new Response(null, { 
      status: 204,
      headers: {
        'X-Cache-Invalidated': 'true',
        'X-Cache-Version': (GLOBAL.__articles_cache?.version || 0).toString(),
        'X-Operation': 'DELETE',
        'X-Invalidation-Timestamp': now.toString(),
        'X-Article-Id': id.toString()
      }
    });
  } catch (e: any) {
    const detail = e?.message || String(e);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', detail }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};


