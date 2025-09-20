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
    
    if (!articleId || !action || !['like', 'unlike'].includes(action)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid request data. Required: articleId, action (like/unlike)'
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

    if (action === 'like') {
      // 添加点赞（如果不存在）
      result = await withRetry(async () => {
        return await db.articleLike.upsert({
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
            // 如果已存在，更新创建时间（重新点赞）
            createdAt: new Date()
          }
        });
      }, 'Add like');

      console.log(`✅ User ${userId} liked article ${articleId}`);
    } else {
      // 取消点赞
      result = await withRetry(async () => {
        return await db.articleLike.deleteMany({
          where: {
            articleId: articleIdInt,
            userId: userId
          }
        });
      }, 'Remove like');

      console.log(`✅ User ${userId} unliked article ${articleId}`);
    }

    // 获取最新的点赞统计
    const likeCount = await withRetry(async () => {
      return await db.articleLike.count({
        where: { articleId: articleIdInt }
      });
    }, 'Get like count');

    // 检查当前用户是否已点赞
    const userLiked = await withRetry(async () => {
      const like = await db.articleLike.findUnique({
        where: {
          articleId_userId: {
            articleId: articleIdInt,
            userId: userId
          }
        }
      });
      return !!like;
    }, 'Check user liked');

    return new Response(JSON.stringify({
      success: true,
      message: action === 'like' ? 'Article liked successfully' : 'Article unliked successfully',
      data: {
        articleId: articleIdInt,
        action: action,
        likeCount: likeCount,
        userLiked: userLiked
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Like API error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET: 获取文章点赞状态和统计
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

    // 获取点赞数量
    const likeCount = await withRetry(async () => {
      return await db.articleLike.count({
        where: { articleId: articleIdInt }
      });
    }, 'Get like count');

    let userLiked = false;
    
    // 如果用户已登录，检查是否已点赞
    const token = cookies.get('token')?.value;
    if (token) {
      try {
        const decoded = verify(token, JWT_SECRET) as any;
        const userId = decoded.id;
        
        const like = await withRetry(async () => {
          return await db.articleLike.findUnique({
            where: {
              articleId_userId: {
                articleId: articleIdInt,
                userId: userId
              }
            }
          });
        }, 'Check user liked');
        
        userLiked = !!like;
      } catch (e) {
        // Token invalid, userLiked remains false
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        articleId: articleIdInt,
        likeCount: likeCount,
        userLiked: userLiked
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Get like status error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
