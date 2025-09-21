export const prerender = false;
import type { APIRoute } from 'astro';
import pkg from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
const { verify } = pkg;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 验证用户身份
    const token = cookies.get('token')?.value;
    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const decoded = verify(token, JWT_SECRET) as any;
    const userId = decoded.id;

    // 解析请求数据
    const { articleId, action } = await request.json();
    
    if (!articleId || !action || !['favorite', 'unfavorite'].includes(action)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid request data. Required: articleId, action (favorite/unfavorite)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = createDatabaseConnection();

    // 检查文章是否存在
    const article = await withRetry(async () => {
      return await db.article.findUnique({
        where: { id: parseInt(articleId) },
        select: { id: true, title: true }
      });
    }, 'Check article exists');

    if (!article) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Article not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let result;
    const articleIdInt = parseInt(articleId);

    if (action === 'favorite') {
      // 添加收藏（如果不存在）
      result = await withRetry(async () => {
        return await db.articleFavorite.upsert({
          where: {
            articleId_userId: {
              articleId: articleIdInt,
              userId: userId
            }
          },
          create: {
            articleId: articleIdInt,
            userId: userId
          },
          update: {
            // 如果已存在，更新创建时间（重新收藏）
            createdAt: new Date()
          }
        });
      }, 'Add favorite');

      console.log(`✅ User ${userId} favorited article ${articleId}`);
    } else {
      // 取消收藏
      result = await withRetry(async () => {
        return await db.articleFavorite.deleteMany({
          where: {
            articleId: articleIdInt,
            userId: userId
          }
        });
      }, 'Remove favorite');

      console.log(`✅ User ${userId} unfavorited article ${articleId}`);
    }

    // 获取最新的收藏统计
    const favoriteCount = await withRetry(async () => {
      return await db.articleFavorite.count({
        where: { articleId: articleIdInt }
      });
    }, 'Get favorite count');

    // 检查当前用户是否已收藏
    const userFavorited = await withRetry(async () => {
      const favorite = await db.articleFavorite.findUnique({
        where: {
          articleId_userId: {
            articleId: articleIdInt,
            userId: userId
          }
        }
      });
      return !!favorite;
    }, 'Check user favorited');

    return new Response(JSON.stringify({
      success: true,
      message: action === 'favorite' ? 'Article favorited successfully' : 'Article unfavorited successfully',
      data: {
        articleId: articleIdInt,
        action: action,
        favoriteCount: favoriteCount,
        userFavorited: userFavorited
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Favorite API error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET: 获取文章收藏状态和统计
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const url = new URL(request.url);
    const articleId = url.searchParams.get('articleId');
    
    if (!articleId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Article ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = createDatabaseConnection();
    const articleIdInt = parseInt(articleId);

    // 获取收藏数量
    const favoriteCount = await withRetry(async () => {
      return await db.articleFavorite.count({
        where: { articleId: articleIdInt }
      });
    }, 'Get favorite count');

    let userFavorited = false;
    
    // 如果用户已登录，检查是否已收藏
    const token = cookies.get('token')?.value;
    if (token) {
      try {
        const decoded = verify(token, JWT_SECRET) as any;
        const userId = decoded.id;
        
        const favorite = await withRetry(async () => {
          return await db.articleFavorite.findUnique({
            where: {
              articleId_userId: {
                articleId: articleIdInt,
                userId: userId
              }
            }
          });
        }, 'Check user favorited');
        
        userFavorited = !!favorite;
      } catch (e) {
        // Token invalid, userFavorited remains false
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        articleId: articleIdInt,
        favoriteCount: favoriteCount,
        userFavorited: userFavorited
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Get favorite status error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
