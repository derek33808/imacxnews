export const prerender = false;
import type { APIRoute } from 'astro';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

// 搜索缓存配置
const SEARCH_CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存
const searchCache = new Map<string, { data: any; timestamp: number }>();

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim();
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    if (!query) {
      return new Response(JSON.stringify({ 
        articles: [], 
        total: 0, 
        hasMore: false,
        query: '',
        message: 'Please provide a search query'
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查缓存
    const cacheKey = `${query.toLowerCase()}-${limit}-${offset}`;
    const cached = searchCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < SEARCH_CACHE_DURATION) {
      console.log('🔍 Using cached search results for:', query);
      return new Response(JSON.stringify({
        ...cached.data,
        fromCache: true,
        cacheTimestamp: cached.timestamp
      }), {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache-Hit': 'true',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    try {
      const prisma = createDatabaseConnection();
      
      // 准备搜索条件
      const searchTerms = query.split(' ').filter(term => term.length > 0);
      const searchConditions = searchTerms.map(term => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { excerpt: { contains: term, mode: 'insensitive' } },
          { content: { contains: term, mode: 'insensitive' } },
          { chineseContent: { contains: term, mode: 'insensitive' } },
          { category: { contains: term, mode: 'insensitive' } },
          { author: { contains: term, mode: 'insensitive' } },
        ]
      }));

      // 执行搜索
      const articles = await withRetry(async () => {
        return await prisma.article.findMany({
          where: {
            AND: searchConditions
          },
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
            mediaType: true,
            videoUrl: true,
            videoPoster: true,
            videoDuration: true,
            contentLength: true,
            readingTime: true,
          },
          orderBy: [
            { featured: 'desc' }, // 特色文章优先
            { publishDate: 'desc' }
          ],
          take: limit,
          skip: offset
        });
      }, `Search articles for: ${query}`);

      // 获取总数（用于分页）
      const total = await withRetry(async () => {
        return await prisma.article.count({
          where: {
            AND: searchConditions
          }
        });
      }, `Count search results for: ${query}`);

      const hasMore = offset + limit < total;

      // 为结果添加搜索高亮信息
      const resultsWithHighlight = articles.map(article => {
        // 查找匹配的字段
        const matchedFields: string[] = [];
        const lowerQuery = query.toLowerCase();
        
        if (article.title?.toLowerCase().includes(lowerQuery)) matchedFields.push('title');
        if (article.excerpt?.toLowerCase().includes(lowerQuery)) matchedFields.push('excerpt');
        if (article.category?.toLowerCase().includes(lowerQuery)) matchedFields.push('category');
        if (article.author?.toLowerCase().includes(lowerQuery)) matchedFields.push('author');

        return {
          ...article,
          matchedFields,
          // 生成高亮摘要
          highlightedExcerpt: generateHighlightedExcerpt(article.excerpt || '', query)
        };
      });

      const responseData = {
        articles: resultsWithHighlight,
        total,
        hasMore,
        query,
        searchTerms,
        resultsCount: articles.length,
        fromCache: false,
        searchTimestamp: now
      };

      // 缓存结果
      searchCache.set(cacheKey, {
        data: responseData,
        timestamp: now
      });

      // 清理过期缓存
      cleanExpiredCache();

      console.log(`🔍 Search completed: "${query}" - ${articles.length} results`);

      return new Response(JSON.stringify(responseData), {
        headers: { 
          'Content-Type': 'application/json',
          'X-Cache-Hit': 'false',
          'Cache-Control': 'public, max-age=300'
        }
      });

    } catch (searchError) {
      console.error('Error executing search:', searchError);
      return new Response(JSON.stringify({ 
        error: 'Search failed',
        detail: searchError instanceof Error ? searchError.message : String(searchError),
        articles: [],
        total: 0,
        hasMore: false,
        query
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (e: any) {
    console.error('Search API error:', e?.message);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      detail: e?.message,
      articles: [],
      total: 0,
      hasMore: false
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// 生成高亮摘要的辅助函数
function generateHighlightedExcerpt(excerpt: string, query: string, maxLength: number = 200): string {
  if (!excerpt || !query) return excerpt || '';
  
  const lowerExcerpt = excerpt.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryIndex = lowerExcerpt.indexOf(lowerQuery);
  
  if (queryIndex === -1) {
    // 如果没有直接匹配，返回截断的摘要
    return excerpt.length > maxLength ? excerpt.substring(0, maxLength) + '...' : excerpt;
  }
  
  // 计算高亮区域
  const start = Math.max(0, queryIndex - 50);
  const end = Math.min(excerpt.length, queryIndex + query.length + 50);
  
  let result = excerpt.substring(start, end);
  
  if (start > 0) result = '...' + result;
  if (end < excerpt.length) result = result + '...';
  
  // 添加简单的高亮标记（由前端处理）
  result = result.replace(new RegExp(`(${escapeRegExp(query)})`, 'gi'), '<mark>$1</mark>');
  
  return result;
}

// 转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 清理过期缓存
function cleanExpiredCache() {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > SEARCH_CACHE_DURATION) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => searchCache.delete(key));
  
  if (expiredKeys.length > 0) {
    console.log(`🧹 Cleaned ${expiredKeys.length} expired search cache entries`);
  }
}
