export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../../lib/database';

export const POST: APIRoute = async ({ request }) => {
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
      console.log('✅ Token verified for change role API:', userPayload.username, 'role:', userPayload.role);
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

    const body = await request.json();
    const { userId, newRole } = body;

    // 输入验证
    if (!userId || !newRole) {
      return new Response(
        JSON.stringify({ error: 'User ID and new role are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['USER', 'ADMIN'].includes(newRole)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be USER or ADMIN' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 防止管理员修改自己的角色
    if (userId === userPayload.id) {
      return new Response(
        JSON.stringify({ error: 'You cannot change your own role' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = createDatabaseConnection();
    
    // 检查目标用户是否存在
    const targetUser = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: parseInt(userId) },
        select: {
          id: true,
          username: true,
          role: true
        }
      });
    }, 'Find target user');

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查是否真的需要更改角色
    if (targetUser.role === newRole) {
      return new Response(
        JSON.stringify({ error: `User is already a ${newRole.toLowerCase()}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 更新用户角色
    const updatedUser = await withRetry(async () => {
      return await db.user.update({
        where: { id: parseInt(userId) },
        data: { role: newRole },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true
        }
      });
    }, 'Update user role');

    console.log(`✅ Admin ${userPayload.username} changed role of user ${targetUser.username} from ${targetUser.role} to ${newRole}`);

    return new Response(JSON.stringify({
      success: true,
      user: updatedUser,
      message: `User role changed from ${targetUser.role} to ${newRole}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Change user role error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to change user role. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
