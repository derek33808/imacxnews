import { randomBytes, createHash } from 'crypto';
import { createDatabaseConnection, withRetry } from './database';

/**
 * 密码重置令牌管理工具
 */

/**
 * 生成安全的重置令牌
 */
export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * 哈希令牌（用于数据库存储）
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * 创建密码重置令牌记录
 */
export async function createPasswordResetToken(userId: number): Promise<string> {
  const db = createDatabaseConnection();
  
  // 生成原始令牌（用于发送给用户）
  const rawToken = generateResetToken();
  // 哈希令牌（用于数据库存储）
  const hashedToken = hashToken(rawToken);
  
  // 令牌过期时间：1小时
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  
  // 先清除该用户的所有旧令牌
  await withRetry(async () => {
    return await db.passwordResetToken.deleteMany({
      where: { userId }
    });
  }, 'Clear old password reset tokens');
  
  // 创建新令牌
  await withRetry(async () => {
    return await db.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt
      }
    });
  }, 'Create password reset token');
  
  console.log(`🔑 Password reset token created for user ${userId}, expires at: ${expiresAt.toISOString()}`);
  
  // 返回原始令牌（用于发送邮件）
  return rawToken;
}

/**
 * 验证密码重置令牌
 */
export async function validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: number; error?: string }> {
  const db = createDatabaseConnection();
  
  try {
    const hashedToken = hashToken(token);
    
    // 查找令牌记录
    const tokenRecord = await withRetry(async () => {
      return await db.passwordResetToken.findUnique({
        where: { token: hashedToken },
        include: {
          user: {
            select: { id: true, username: true, email: true }
          }
        }
      });
    }, 'Find password reset token');
    
    if (!tokenRecord) {
      return { valid: false, error: 'Invalid reset token' };
    }
    
    if (tokenRecord.isUsed) {
      return { valid: false, error: 'Reset token has already been used' };
    }
    
    if (new Date() > tokenRecord.expiresAt) {
      // 清理过期令牌
      await withRetry(async () => {
        return await db.passwordResetToken.delete({
          where: { id: tokenRecord.id }
        });
      }, 'Delete expired token');
      
      return { valid: false, error: 'Reset token has expired' };
    }
    
    return { valid: true, userId: tokenRecord.userId };
    
  } catch (error) {
    console.error('Error validating password reset token:', error);
    return { valid: false, error: 'Token validation failed' };
  }
}

/**
 * 标记令牌为已使用
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  const db = createDatabaseConnection();
  const hashedToken = hashToken(token);
  
  await withRetry(async () => {
    return await db.passwordResetToken.update({
      where: { token: hashedToken },
      data: { isUsed: true }
    });
  }, 'Mark token as used');
}

/**
 * 清理过期的重置令牌（定期清理任务）
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const db = createDatabaseConnection();
  
  try {
    const result = await withRetry(async () => {
      return await db.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },  // 过期的令牌
            { isUsed: true }                    // 已使用的令牌
          ]
        }
      });
    }, 'Clean up expired tokens');
    
    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} expired/used password reset tokens`);
    }
    
    return result.count;
    
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
}

/**
 * 生成重置密码的完整URL
 */
export function generateResetUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || 'https://imacxnews.com';
  return `${base}/auth/reset-password?token=${token}`;
}

/**
 * 邮箱格式验证
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * 密码验证（与注册保持一致）
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

/**
 * 密码哈希（与注册保持一致）
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

