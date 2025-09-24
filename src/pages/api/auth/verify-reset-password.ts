export const prerender = false;
import type { APIRoute } from 'astro';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
import { sendPasswordResetConfirmation } from '../../../lib/email';
import { 
  validatePasswordResetToken,
  markTokenAsUsed,
  isValidPassword,
  hashPassword,
  cleanupExpiredTokens
} from '../../../lib/password-reset';

/**
 * 密码重置验证 API
 * 通过令牌重置用户密码
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    // 输入验证
    if (!token || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Reset token and new password are required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证新密码强度
    if (!isValidPassword(newPassword)) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证重置令牌
    const tokenValidation = await validatePasswordResetToken(token);
    
    if (!tokenValidation.valid) {
      console.log(`❌ Invalid password reset token attempt: ${tokenValidation.error}`);
      return new Response(
        JSON.stringify({ 
          error: tokenValidation.error || 'Invalid or expired reset token' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = tokenValidation.userId!;
    const db = createDatabaseConnection();

    // 获取用户信息
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true
        }
      });
    }, 'Find user for password reset verification');

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 哈希新密码
    const hashedNewPassword = hashPassword(newPassword);

    // 更新用户密码
    await withRetry(async () => {
      return await db.user.update({
        where: { id: userId },
        data: { 
          password: hashedNewPassword,
          lastLoginAt: new Date() // 更新最后活动时间
        }
      });
    }, 'Update user password');

    // 标记令牌为已使用
    await markTokenAsUsed(token);

    console.log(`🔄 Password reset successful for user: ${user.username} (${user.email})`);

    // 异步发送密码重置确认邮件（不阻塞响应）
    sendPasswordResetConfirmation(user.email, user.username, user.displayName).catch(error => {
      console.error('Failed to send password reset confirmation email:', error);
      // 邮件发送失败不影响密码重置流程，只记录错误
    });

    // 异步清理过期令牌（不阻塞响应）
    cleanupExpiredTokens().catch(error => {
      console.error('Failed to cleanup expired tokens:', error);
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Password reset verification error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to reset password. Please try again or request a new reset link.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * 验证重置令牌（GET请求，不重置密码，只检查令牌有效性）
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Reset token is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证重置令牌
    const tokenValidation = await validatePasswordResetToken(token);
    
    if (!tokenValidation.valid) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: tokenValidation.error || 'Invalid or expired reset token' 
        }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取用户信息
    const db = createDatabaseConnection();
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: tokenValidation.userId! },
        select: {
          username: true,
          email: true
        }
      });
    }, 'Find user for token validation');

    return new Response(JSON.stringify({
      valid: true,
      user: user ? {
        username: user.username,
        email: user.email
      } : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Token validation error:', error);
    
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Failed to validate reset token' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

