export const prerender = false;
import type { APIRoute } from 'astro';
import pkg from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
const { verify } = pkg;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

// POST: 发布新评论或回复
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
    const { articleId, body, parentId } = await request.json();
    
    if (!articleId || !body || body.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Article ID and comment body are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查评论长度
    if (body.trim().length > 2000) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Comment is too long (max 2000 characters)'
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

    // 如果是回复，检查父评论是否存在
    if (parentId) {
      const parentComment = await withRetry(async () => {
        return await db.comment.findUnique({
          where: { id: parseInt(parentId) },
          select: { id: true, articleId: true }
        });
      }, 'Check parent comment exists');

      if (!parentComment || parentComment.articleId !== articleIdInt) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Parent comment not found or does not belong to this article'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 创建评论
    const comment = await withRetry(async () => {
      return await db.comment.create({
        data: {
          articleId: articleIdInt,
          userId: userId,
          body: body.trim(),
          parentId: parentId ? parseInt(parentId) : null
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          }
        }
      });
    }, 'Create comment');

    console.log(`✅ User ${userId} commented on article ${articleId}${parentId ? ` (reply to ${parentId})` : ''}`);

    // 获取更新后的总评论数
    const totalComments = await withRetry(async () => {
      return await db.comment.count({
        where: { articleId: articleIdInt }
      });
    }, 'Count total comments');

    return new Response(JSON.stringify({
      success: true,
      message: 'Comment posted successfully',
      data: {
        comment: {
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt,
          parentId: comment.parentId,
          user: comment.user
        },
        totalComments: totalComments
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Comment POST API error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET: 获取文章评论列表
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const articleId = url.searchParams.get('articleId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
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
    const offset = (page - 1) * limit;

    // 获取顶级评论（非回复的评论）
    const comments = await withRetry(async () => {
      return await db.comment.findMany({
        where: {
          articleId: articleIdInt,
          parentId: null // 只获取顶级评论
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true
                }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      });
    }, 'Get comments');

    // 获取总评论数（包括回复）
    const totalComments = await withRetry(async () => {
      return await db.comment.count({
        where: { articleId: articleIdInt }
      });
    }, 'Get total comment count');

    // 获取顶级评论数（用于分页）
    const totalTopLevelComments = await withRetry(async () => {
      return await db.comment.count({
        where: {
          articleId: articleIdInt,
          parentId: null
        }
      });
    }, 'Get top level comment count');

    return new Response(JSON.stringify({
      success: true,
      data: {
        comments: comments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTopLevelComments / limit),
          totalComments: totalComments,
          totalTopLevelComments: totalTopLevelComments,
          hasNextPage: offset + limit < totalTopLevelComments,
          hasPrevPage: page > 1
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Get comments error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: 删除评论（管理员功能）
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    // 验证用户身份和管理员权限
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
    }, 'Check user role');

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
    const { commentId } = await request.json();
    
    if (!commentId) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Comment ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const commentIdInt = parseInt(commentId);

    // 检查评论是否存在
    const comment = await withRetry(async () => {
      return await db.comment.findUnique({
        where: { id: commentIdInt },
        include: {
          user: {
            select: { username: true }
          }
        }
      });
    }, 'Check comment exists');

    if (!comment) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Comment not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 删除评论及其所有回复
    await withRetry(async () => {
      // 先删除回复
      await db.comment.deleteMany({
        where: { parentId: commentIdInt }
      });
      
      // 再删除主评论
      await db.comment.delete({
        where: { id: commentIdInt }
      });
    }, 'Delete comment and replies');

    console.log(`✅ Admin ${userId} deleted comment ${commentId} by user ${comment.user.username}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Comment deleted successfully',
      data: {
        deletedCommentId: commentIdInt
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Delete comment error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
