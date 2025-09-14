export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

export const GET: APIRoute = async ({ request }) => {
  try {
    // 验证认证 - 正确的cookie名称是'token'，不是'auth'
    const cookieHeader = request.headers.get('cookie') || '';
    const authCookie = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

    if (!authCookie) {
      console.log('❌ No auth token found in cookies:', cookieHeader);
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let userPayload;
    try {
      userPayload = jwt.verify(decodeURIComponent(authCookie), import.meta.env.JWT_SECRET) as any;
      console.log('✅ Token verified for admin users API:', userPayload.username, 'role:', userPayload.role);
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

    const db = createDatabaseConnection();
    
    // 获取所有用户
    const users = await withRetry(async () => {
      return await db.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          role: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: [
          { role: 'desc' }, // ADMIN first
          { lastLoginAt: 'desc' }, // Recent activity first
          { createdAt: 'desc' } // Newest first
        ]
      });
    }, 'Get all users');

    // 计算统计信息
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const stats = {
      total: users.length,
      admins: users.filter(u => u.role === 'ADMIN').length,
      active: users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > thirtyMinutesAgo).length,
      newThisWeek: users.filter(u => new Date(u.createdAt) > weekAgo).length
    };

    console.log('✅ Admin fetched users list:', users.length, 'users');

    return new Response(JSON.stringify({
      success: true,
      users: users,
      stats: stats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Get users error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to fetch users. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
