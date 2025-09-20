export const prerender = false;
import type { APIRoute } from 'astro';
import pkg from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
const { verify } = pkg;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

// GET: 获取互动数据的详细信息（管理员专用）
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // 验证管理员身份
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

    const db = createDatabaseConnection();

    // 检查用户是否为管理员
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
    }, 'Check admin role');

    if (!user || user.role !== 'ADMIN') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Admin privileges required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'likes', 'favorites', 'comments'
    const articleId = url.searchParams.get('articleId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    if (!type || !['likes', 'favorites', 'comments'].includes(type)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid type. Must be: likes, favorites, or comments'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let data;
    let total;

    if (type === 'likes') {
      // 获取点赞详情
      const whereClause = articleId ? { articleId: parseInt(articleId) } : {};
      
      [data, total] = await Promise.all([
        withRetry(async () => {
          return await db.articleLike.findMany({
            where: whereClause,
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  email: true
                }
              },
              article: {
                select: {
                  id: true,
                  title: true,
                  slug: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit
          });
        }, 'Get likes data'),
        
        withRetry(async () => {
          return await db.articleLike.count({ where: whereClause });
        }, 'Get likes count')
      ]);

    } else if (type === 'favorites') {
      // 获取收藏详情
      const whereClause = articleId ? { articleId: parseInt(articleId) } : {};
      
      [data, total] = await Promise.all([
        withRetry(async () => {
          return await db.articleFavorite.findMany({
            where: whereClause,
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  email: true
                }
              },
              article: {
                select: {
                  id: true,
                  title: true,
                  slug: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit
          });
        }, 'Get favorites data'),
        
        withRetry(async () => {
          return await db.articleFavorite.count({ where: whereClause });
        }, 'Get favorites count')
      ]);

    } else if (type === 'comments') {
      // 获取评论详情
      const whereClause = articleId ? { articleId: parseInt(articleId) } : {};
      
      [data, total] = await Promise.all([
        withRetry(async () => {
          return await db.comment.findMany({
            where: whereClause,
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                  email: true
                }
              },
              article: {
                select: {
                  id: true,
                  title: true,
                  slug: true
                }
              },
              parent: {
                select: {
                  id: true,
                  body: true,
                  user: {
                    select: {
                      username: true,
                      displayName: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit
          });
        }, 'Get comments data'),
        
        withRetry(async () => {
          return await db.comment.count({ where: whereClause });
        }, 'Get comments count')
      ]);
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        type: type,
        items: data,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          hasNextPage: offset + limit < total,
          hasPrevPage: page > 1
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Admin interactions API error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: 删除互动数据（管理员专用）
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    // 验证管理员身份
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

    const db = createDatabaseConnection();

    // 检查用户是否为管理员
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
    }, 'Check admin role');

    if (!user || user.role !== 'ADMIN') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Admin privileges required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 解析请求数据
    const { type, id } = await request.json();
    
    if (!type || !id || !['like', 'favorite', 'comment'].includes(type)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid type or missing id. Type must be: like, favorite, or comment'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const idInt = parseInt(id);
    let deletedItem;

    if (type === 'like') {
      // 删除点赞
      deletedItem = await withRetry(async () => {
        return await db.articleLike.delete({
          where: { id: idInt },
          include: {
            user: { select: { username: true } },
            article: { select: { title: true } }
          }
        });
      }, 'Delete like');

    } else if (type === 'favorite') {
      // 删除收藏
      deletedItem = await withRetry(async () => {
        return await db.articleFavorite.delete({
          where: { id: idInt },
          include: {
            user: { select: { username: true } },
            article: { select: { title: true } }
          }
        });
      }, 'Delete favorite');

    } else if (type === 'comment') {
      // 删除评论（以及所有回复）
      await withRetry(async () => {
        // 先删除回复
        await db.comment.deleteMany({
          where: { parentId: idInt }
        });
        
        // 再删除主评论
        deletedItem = await db.comment.delete({
          where: { id: idInt },
          include: {
            user: { select: { username: true } },
            article: { select: { title: true } }
          }
        });
      }, 'Delete comment and replies');
    }

    console.log(`✅ Admin ${userId} deleted ${type} ${idInt} by user ${deletedItem.user.username}`);

    return new Response(JSON.stringify({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`,
      data: {
        deletedId: idInt,
        type: type
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Admin delete interaction error:', error.message);
    
    if (error.code === 'P2025') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Item not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: 获取互动统计概览（管理员仪表板）
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // 验证管理员身份
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

    const db = createDatabaseConnection();

    // 检查用户是否为管理员
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
    }, 'Check admin role');

    if (!user || user.role !== 'ADMIN') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Admin privileges required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取统计数据
    const [
      totalLikes,
      totalFavorites, 
      totalComments,
      likesToday,
      favoritesToday,
      commentsToday,
      topLikedArticles,
      topCommentedArticles,
      mostActiveUsers
    ] = await Promise.all([
      // 总数统计
      withRetry(async () => db.articleLike.count(), 'Count total likes'),
      withRetry(async () => db.articleFavorite.count(), 'Count total favorites'),
      withRetry(async () => db.comment.count(), 'Count total comments'),
      
      // 今日统计
      withRetry(async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return db.articleLike.count({
          where: { createdAt: { gte: today } }
        });
      }, 'Count today likes'),
      
      withRetry(async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return db.articleFavorite.count({
          where: { createdAt: { gte: today } }
        });
      }, 'Count today favorites'),
      
      withRetry(async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return db.comment.count({
          where: { createdAt: { gte: today } }
        });
      }, 'Count today comments'),
      
      // 热门文章
      withRetry(async () => {
        return db.article.findMany({
          select: {
            id: true,
            title: true,
            slug: true,
            _count: {
              select: { likes: true }
            }
          },
          orderBy: {
            likes: { _count: 'desc' }
          },
          take: 5
        });
      }, 'Get top liked articles'),
      
      withRetry(async () => {
        return db.article.findMany({
          select: {
            id: true,
            title: true,
            slug: true,
            _count: {
              select: { comments: true }
            }
          },
          orderBy: {
            comments: { _count: 'desc' }
          },
          take: 5
        });
      }, 'Get top commented articles'),
      
      // 活跃用户
      withRetry(async () => {
        return db.user.findMany({
          where: { role: 'USER' },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            _count: {
              select: {
                likes: true,
                favorites: true,
                comments: true
              }
            }
          },
          orderBy: {
            comments: { _count: 'desc' }
          },
          take: 10
        });
      }, 'Get most active users')
    ]);

    return new Response(JSON.stringify({
      success: true,
      data: {
        overview: {
          totalLikes,
          totalFavorites,
          totalComments,
          todayStats: {
            likes: likesToday,
            favorites: favoritesToday,
            comments: commentsToday
          }
        },
        topArticles: {
          mostLiked: topLikedArticles,
          mostCommented: topCommentedArticles
        },
        activeUsers: mostActiveUsers
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Admin stats API error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
