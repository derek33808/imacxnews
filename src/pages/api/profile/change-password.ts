export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

// 验证密码函数（与其他auth文件保持一致）
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const computedHash = createHash('sha256').update(password + salt).digest('hex');
  return hash === computedHash;
}

// 哈希密码函数（与register.ts保持一致）
function hashPassword(password: string): string {
  const salt = createHash('sha256').update(Math.random().toString()).digest('hex').substring(0, 16);
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

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
    const { currentPassword, newPassword } = body;

    // 输入验证
    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Current password and new password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'New password must be at least 6 characters long' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = createDatabaseConnection();
    
    // 获取当前用户密码
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: userPayload.id },
        select: {
          id: true,
          username: true,
          password: true
        }
      });
    }, 'Find user for password change');

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证当前密码
    const isCurrentPasswordValid = verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return new Response(
        JSON.stringify({ error: 'Current password is incorrect' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 哈希新密码
    const hashedNewPassword = hashPassword(newPassword);
    
    // 更新密码
    await withRetry(async () => {
      return await db.user.update({
        where: { id: user.id },
        data: { password: hashedNewPassword }
      });
    }, 'Update user password');

    console.log('✅ Password changed successfully for user:', user.username);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password changed successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to change password. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
