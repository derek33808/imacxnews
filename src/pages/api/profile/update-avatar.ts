export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

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
    } catch (error) {
      console.log('❌ Token verification failed:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 解析JSON数据
    const body = await request.json();
    const { avatar } = body;

    if (!avatar) {
      return new Response(
        JSON.stringify({ error: 'Avatar emoji is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证是否为有效的emoji（简单验证）
    if (typeof avatar !== 'string' || avatar.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Invalid avatar format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = createDatabaseConnection();
    
    // 更新用户头像
    const updatedUser = await withRetry(async () => {
      return await db.user.update({
        where: { id: userPayload.id },
        data: { avatar: avatar },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          role: true
        }
      });
    }, 'Update user avatar');

    console.log('✅ Avatar updated for user:', updatedUser.username, 'to:', avatar);

    return new Response(JSON.stringify({
      success: true,
      user: updatedUser
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Update avatar error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to update avatar. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
