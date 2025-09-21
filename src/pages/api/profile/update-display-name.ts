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

    const body = await request.json();
    const { displayName } = body;

    // 输入验证
    if (typeof displayName !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Display name must be a string' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanDisplayName = displayName.trim();
    
    // 验证显示名称长度
    if (cleanDisplayName.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Display name must be 50 characters or less' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 允许空字符串（清除显示名称）
    const finalDisplayName = cleanDisplayName || null;

    const db = createDatabaseConnection();
    
    // 更新用户显示名称
    const updatedUser = await withRetry(async () => {
      return await db.user.update({
        where: { id: userPayload.id },
        data: { displayName: finalDisplayName },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          role: true
        }
      });
    }, 'Update user display name');

    console.log('✅ Display name updated for user:', updatedUser.username, 'to:', finalDisplayName);

    return new Response(JSON.stringify({
      success: true,
      user: updatedUser
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Update display name error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to update display name. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
