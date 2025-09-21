export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../../lib/database';

export const POST: APIRoute = async ({ request }) => {
  let requestBody: any;
  let userPayload: any;
  
  try {
    // 验证认证
    const cookieHeader = request.headers.get('cookie') || '';
    const authCookie = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

    if (!authCookie) {
      console.log('❌ No auth token found in cookies');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      userPayload = jwt.verify(decodeURIComponent(authCookie), import.meta.env.JWT_SECRET) as any;
      console.log('✅ Token verified for delete user API:', userPayload.username, 'role:', userPayload.role);
    } catch (error) {
      console.log('❌ Token verification failed:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证管理员权限
    if (userPayload.role !== 'ADMIN') {
      return new Response(
        JSON.stringify({ error: 'Administrator access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取请求体
    try {
      requestBody = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = requestBody;

    if (!userId || typeof userId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Valid user ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = createDatabaseConnection();

    // 检查要删除的用户是否存在
    const targetUser = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true }
      });
    }, 'Find target user for deletion');

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 防止删除自己
    if (targetUser.id === userPayload.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot delete your own account' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 使用事务删除用户及其相关数据
    console.log(`🗑️ Starting deletion process for user ${targetUser.username} (ID: ${userId})`);
    
    await withRetry(async () => {
      return await db.$transaction(async (prisma) => {
        console.log('📊 Counting related data before deletion...');
        
        // 统计相关数据
        const [commentsCount, likesCount, favoritesCount, subscriptionsCount, notificationsCount, mediaFilesCount] = await Promise.all([
          prisma.comment.count({ where: { userId: userId } }),
          prisma.articleLike.count({ where: { userId: userId } }),
          prisma.articleFavorite.count({ where: { userId: userId } }),
          prisma.newsSubscription.count({ where: { userId: userId } }),
          prisma.notification.count({ where: { userId: userId } }),
          prisma.mediaFile.count({ where: { uploadedBy: userId } })
        ]);

        console.log(`📊 Found related data:`, {
          comments: commentsCount,
          likes: likesCount,
          favorites: favoritesCount,
          subscriptions: subscriptionsCount,
          notifications: notificationsCount,
          mediaFiles: mediaFilesCount
        });

        // 删除用户的评论
        console.log(`🗑️ Deleting ${commentsCount} comments...`);
        await prisma.comment.deleteMany({
          where: { userId: userId }
        });

        // 删除用户的点赞记录
        console.log(`🗑️ Deleting ${likesCount} likes...`);
        await prisma.articleLike.deleteMany({
          where: { userId: userId }
        });

        // 删除用户的收藏记录
        console.log(`🗑️ Deleting ${favoritesCount} favorites...`);
        await prisma.articleFavorite.deleteMany({
          where: { userId: userId }
        });

        // 删除用户的订阅记录
        console.log(`🗑️ Deleting ${subscriptionsCount} subscriptions...`);
        await prisma.newsSubscription.deleteMany({
          where: { userId: userId }
        });

        // 删除用户的通知记录
        console.log(`🗑️ Deleting ${notificationsCount} notifications...`);
        await prisma.notification.deleteMany({
          where: { userId: userId }
        });

        // 删除用户上传的媒体文件
        console.log(`🗑️ Deleting ${mediaFilesCount} media files...`);
        await prisma.mediaFile.deleteMany({
          where: { uploadedBy: userId }
        });

        // 最后删除用户
        console.log(`🗑️ Deleting user ${targetUser.username}...`);
        await prisma.user.delete({
          where: { id: userId }
        });
        
        console.log(`✅ Successfully deleted user ${targetUser.username} and all related data`);
      });
    }, 'Delete user and related data');

    console.log(`✅ Admin ${userPayload.username} deleted user:`, targetUser.username);

    return new Response(JSON.stringify({
      success: true,
      message: `User ${targetUser.username} has been deleted successfully`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Delete user error:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      userId: requestBody?.userId,
      adminUser: userPayload?.username
    });
    
    // 根据错误类型返回更具体的错误信息
    let errorMessage = 'Failed to delete user. Please try again.';
    let statusCode = 500;
    
    if (error.code === 'P2003') {
      errorMessage = 'Cannot delete user due to existing references. Please remove related data first.';
    } else if (error.code === 'P2025') {
      errorMessage = 'User not found or already deleted.';
      statusCode = 404;
    } else if (error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Database connection failed. Please try again later.';
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: error.code,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
