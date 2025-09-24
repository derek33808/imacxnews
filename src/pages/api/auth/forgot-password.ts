export const prerender = false;
import type { APIRoute } from 'astro';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
import { sendPasswordResetRequest } from '../../../lib/email';
import { 
  createPasswordResetToken, 
  generateResetUrl,
  isValidEmail,
  cleanupExpiredTokens
} from '../../../lib/password-reset';

/**
 * 密码重置请求 API
 * 接收邮箱地址，发送密码重置邮件
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { email } = body;

    // 输入验证
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email address is required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // 验证邮箱格式
    if (!isValidEmail(cleanEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = createDatabaseConnection();

    // 查找用户
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { email: cleanEmail },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true
        }
      });
    }, 'Find user for password reset');

    // 为了安全，无论用户是否存在都返回成功消息
    // 这样可以防止邮箱枚举攻击
    if (!user) {
      console.log(`🔍 [安全] 密码重置请求 - 邮箱不存在: ${cleanEmail}`);
      console.log(`🔍 [安全] 不会发送邮件，但向前端返回相同的成功响应以防邮箱枚举攻击`);
      return new Response(JSON.stringify({
        success: true,
        message: 'If this email is registered, you will receive a password reset link shortly.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 清理过期令牌（异步执行，不阻塞响应）
    cleanupExpiredTokens().catch(error => {
      console.error('Failed to cleanup expired tokens:', error);
    });

    // 生成重置令牌
    const resetToken = await createPasswordResetToken(user.id);
    
    // 生成重置URL
    const baseUrl = url.origin;
    const resetUrl = generateResetUrl(resetToken, baseUrl);

    console.log(`🔑 [密码重置] 用户存在: ${user.username} (${user.email})`);
    console.log(`🔗 [密码重置] 生成重置令牌URL: ${resetUrl}`);

    // 异步发送密码重置邮件（不阻塞响应）
    const emailResult = await sendPasswordResetRequest(
      user.email, 
      user.username, 
      resetUrl, 
      user.displayName
    ).catch(error => {
      console.error('❌ [密码重置] 邮件发送失败:', error);
      return { success: false, error: error.message };
    });

    if (emailResult.success) {
      console.log('✅ [密码重置] 邮件发送成功:', emailResult);
    } else {
      console.log('❌ [密码重置] 邮件发送失败:', emailResult);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'If this email is registered, you will receive a password reset link shortly.',
      // 在开发环境下可以返回额外信息用于测试
      ...(import.meta.env.NODE_ENV === 'development' && {
        debug: {
          userFound: true,
          username: user.username,
          resetUrl
        }
      })
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Failed to process password reset request. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

