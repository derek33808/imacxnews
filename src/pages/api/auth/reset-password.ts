export const prerender = false;
import type { APIRoute } from 'astro';
import { randomBytes, createHash } from 'crypto';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

// 邮箱格式验证
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 密码验证
function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

// 密码哈希（与注册保持一致）
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { identifier, newPassword } = body; // identifier可以是用户名或邮箱

    // 输入验证
    if (!identifier || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Username/email and new password are required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidPassword(newPassword)) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const db = createDatabaseConnection();

    // 根据输入类型决定查询条件
    const isEmailReset = isValidEmail(cleanIdentifier);
    const whereCondition = isEmailReset 
      ? { email: cleanIdentifier }
      : { username: { equals: identifier.trim(), mode: 'insensitive' as const } };

    // 查找用户
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: whereCondition,
        select: {
          id: true,
          username: true,
          email: true,
          role: true
        }
      });
    }, 'Find user for password reset');

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found with this username/email' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 更新密码
    const hashedPassword = hashPassword(newPassword);
    
    await withRetry(async () => {
      return await db.user.update({
        where: { id: user.id },
        data: { 
          password: hashedPassword,
          lastLoginAt: new Date() // 更新最后活动时间
        }
      });
    }, 'Update user password');

    console.log(`🔄 Password reset successful for user: ${user.username} (${user.email})`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Password reset error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to reset password. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
