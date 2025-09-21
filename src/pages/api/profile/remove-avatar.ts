export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

export const DELETE: APIRoute = async ({ request }) => {
  try {
    // 验证认证 - 正确的cookie名称是'token'，不是'auth'
    const cookieHeader = request.headers.get('cookie') || '';
    const authCookie = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

    if (!authCookie) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let userPayload;
    try {
      userPayload = jwt.verify(decodeURIComponent(authCookie), import.meta.env.JWT_SECRET) as any;
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = createDatabaseConnection();
    
    // 删除用户头像（设置为null）
    const updatedUser = await withRetry(async () => {
      return await db.user.update({
        where: { id: userPayload.id },
        data: { avatar: null },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          role: true
        }
      });
    }, 'Remove user avatar');

    console.log('✅ Avatar removed for user:', updatedUser.username);

    return new Response(JSON.stringify({
      success: true,
      user: updatedUser
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Remove avatar error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to remove avatar. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
