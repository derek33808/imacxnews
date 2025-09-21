export const prerender = false;
import type { APIRoute } from 'astro';
import pkg from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
const { verify } = pkg;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

// GET: 获取文章的所有互动统计信息
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

    // 检查文章是否存在
    const article = await withRetry(async () => {
      return await db.article.findUnique({
        where: { id: articleIdInt },
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

    // 并行获取所有统计数据
    const [likeCount, favoriteCount, commentCount] = await Promise.all([
      // 点赞数
      withRetry(async () => {
        return await db.articleLike.count({
          where: { articleId: articleIdInt }
        });
      }, 'Get like count'),
      
      // 收藏数
      withRetry(async () => {
        return await db.articleFavorite.count({
          where: { articleId: articleIdInt }
        });
      }, 'Get favorite count'),
      
      // 评论数（包括回复）
      withRetry(async () => {
        return await db.comment.count({
          where: { articleId: articleIdInt }
        });
      }, 'Get comment count')
    ]);

    // 用户互动状态（如果已登录）
    let userInteractions = {
      liked: false,
      favorited: false
    };

    const token = cookies.get('token')?.value;
    if (token) {
      try {
        const decoded = verify(token, JWT_SECRET) as any;
        const userId = decoded.id;
        
        // 并行检查用户的点赞和收藏状态
        const [userLike, userFavorite] = await Promise.all([
          withRetry(async () => {
            return await db.articleLike.findUnique({
              where: {
                articleId_userId: {
                  articleId: articleIdInt,
                  userId: userId
                }
              }
            });
          }, 'Check user like'),
          
          withRetry(async () => {
            return await db.articleFavorite.findUnique({
              where: {
                articleId_userId: {
                  articleId: articleIdInt,
                  userId: userId
                }
              }
            });
          }, 'Check user favorite')
        ]);
        
        userInteractions = {
          liked: !!userLike,
          favorited: !!userFavorite
        };
      } catch (e) {
        // Token invalid, keep default values
        console.log('Invalid token in stats API, using default user interactions');
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        articleId: articleIdInt,
        stats: {
          likes: likeCount,
          favorites: favoriteCount,
          comments: commentCount
        },
        userInteractions: userInteractions
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Stats API error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: 批量获取多篇文章的统计信息
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { articleIds } = await request.json();
    
    if (!articleIds || !Array.isArray(articleIds) || articleIds.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Article IDs array is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (articleIds.length > 50) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Too many articles requested (max 50)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = createDatabaseConnection();
    const articleIdsInt = articleIds.map(id => parseInt(id));

    // 获取所有文章的统计数据
    const [likeCounts, favoriteCounts, commentCounts] = await Promise.all([
      // 批量获取点赞数
      withRetry(async () => {
        return await db.articleLike.groupBy({
          by: ['articleId'],
          where: { articleId: { in: articleIdsInt } },
          _count: { articleId: true }
        });
      }, 'Get batch like counts'),
      
      // 批量获取收藏数
      withRetry(async () => {
        return await db.articleFavorite.groupBy({
          by: ['articleId'],
          where: { articleId: { in: articleIdsInt } },
          _count: { articleId: true }
        });
      }, 'Get batch favorite counts'),
      
      // 批量获取评论数
      withRetry(async () => {
        return await db.comment.groupBy({
          by: ['articleId'],
          where: { articleId: { in: articleIdsInt } },
          _count: { articleId: true }
        });
      }, 'Get batch comment counts')
    ]);

    // 转换为易于查找的对象
    const likeCountsMap = Object.fromEntries(
      likeCounts.map(item => [item.articleId, item._count.articleId])
    );
    const favoriteCountsMap = Object.fromEntries(
      favoriteCounts.map(item => [item.articleId, item._count.articleId])
    );
    const commentCountsMap = Object.fromEntries(
      commentCounts.map(item => [item.articleId, item._count.articleId])
    );

    // 用户互动状态（如果已登录）
    let userInteractionsMap: Record<number, { liked: boolean; favorited: boolean }> = {};

    const token = cookies.get('token')?.value;
    if (token) {
      try {
        const decoded = verify(token, JWT_SECRET) as any;
        const userId = decoded.id;
        
        // 批量获取用户的点赞和收藏状态
        const [userLikes, userFavorites] = await Promise.all([
          withRetry(async () => {
            return await db.articleLike.findMany({
              where: {
                articleId: { in: articleIdsInt },
                userId: userId
              },
              select: { articleId: true }
            });
          }, 'Get user likes'),
          
          withRetry(async () => {
            return await db.articleFavorite.findMany({
              where: {
                articleId: { in: articleIdsInt },
                userId: userId
              },
              select: { articleId: true }
            });
          }, 'Get user favorites')
        ]);
        
        const userLikedSet = new Set(userLikes.map(like => like.articleId));
        const userFavoritedSet = new Set(userFavorites.map(fav => fav.articleId));
        
        articleIdsInt.forEach(articleId => {
          userInteractionsMap[articleId] = {
            liked: userLikedSet.has(articleId),
            favorited: userFavoritedSet.has(articleId)
          };
        });
      } catch (e) {
        // Token invalid, initialize with default values
        articleIdsInt.forEach(articleId => {
          userInteractionsMap[articleId] = { liked: false, favorited: false };
        });
      }
    } else {
      // No token, initialize with default values
      articleIdsInt.forEach(articleId => {
        userInteractionsMap[articleId] = { liked: false, favorited: false };
      });
    }

    // 构建响应数据
    const stats = articleIdsInt.map(articleId => ({
      articleId: articleId,
      stats: {
        likes: likeCountsMap[articleId] || 0,
        favorites: favoriteCountsMap[articleId] || 0,
        comments: commentCountsMap[articleId] || 0
      },
      userInteractions: userInteractionsMap[articleId]
    }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        stats: stats
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Batch stats API error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
