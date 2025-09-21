export const prerender = false;
import type { APIRoute } from 'astro';
import pkg from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
const { verify } = pkg;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

// GET: 获取用户收藏的文章列表
export const GET: APIRoute = async ({ request, cookies }) => {
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

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '12');
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');
    
    const offset = (page - 1) * limit;

    const db = createDatabaseConnection();

    // 构建查询条件
    let whereClause: any = {
      userId: userId
    };

    // 添加文章筛选条件
    let articleWhere: any = {};
    if (category && category !== 'all') {
      articleWhere.category = category;
    }
    if (search) {
      articleWhere.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (Object.keys(articleWhere).length > 0) {
      whereClause.article = articleWhere;
    }

    // 获取收藏的文章
    const [favorites, totalCount] = await Promise.all([
      withRetry(async () => {
        return await db.articleFavorite.findMany({
          where: whereClause,
          include: {
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                category: true,
                image: true,
                imageAlt: true,
                author: true,
                publishDate: true,
                featured: true,
                mediaType: true,
                videoUrl: true,
                videoPoster: true,
                videoDuration: true,
                _count: {
                  select: {
                    likes: true,
                    favorites: true,
                    comments: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        });
      }, 'Get user favorites'),

      withRetry(async () => {
        return await db.articleFavorite.count({ where: whereClause });
      }, 'Get favorites count')
    ]);

    // 格式化返回数据
    const articles = favorites.map(fav => ({
      ...fav.article,
      favoriteDate: fav.createdAt,
      stats: {
        likes: fav.article._count.likes,
        favorites: fav.article._count.favorites,
        comments: fav.article._count.comments
      }
    }));

    // 获取可用的分类列表
    const categories = await withRetry(async () => {
      return await db.articleFavorite.findMany({
        where: { userId: userId },
        include: {
          article: {
            select: { category: true }
          }
        },
        distinct: ['articleId']
      });
    }, 'Get favorite categories');

    const availableCategories = [...new Set(categories.map(fav => fav.article.category))];

    return new Response(JSON.stringify({
      success: true,
      data: {
        articles: articles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalItems: totalCount,
          hasNextPage: offset + limit < totalCount,
          hasPrevPage: page > 1
        },
        filters: {
          categories: availableCategories,
          currentCategory: category || 'all',
          currentSearch: search || ''
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Get user favorites error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
