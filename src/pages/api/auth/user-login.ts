export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { setAuthCookie } from '../../../lib/auth';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
import { getRequiredServerEnv, getServerEnv } from '../../../lib/env';

// 验证密码函数（与register.ts保持一致）
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const computedHash = createHash('sha256').update(password + salt).digest('hex');
  return hash === computedHash;
}

// 邮箱格式验证
function isEmail(input: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(input);
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { identifier, password } = body; // identifier可以是用户名或邮箱

    // 输入验证
    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ error: 'Username/email and password are required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const cleanIdentifier = identifier.trim();
    const cleanPassword = password.trim();
    
    // 🆕 首先检查是否为环境变量管理员
    const ADMIN_USERNAME = getServerEnv('ADMIN_USERNAME', { fallback: 'admin' }) || 'admin';
    const ADMIN_PASSWORD = getServerEnv('ADMIN_PASSWORD');
    
    if (ADMIN_PASSWORD && 
        cleanIdentifier.toLowerCase() === ADMIN_USERNAME.toLowerCase() && 
        cleanPassword === ADMIN_PASSWORD) {
      console.log('🔑 Admin login via environment variables');
      
      // 生成管理员JWT token
      const token = jwt.sign(
        { id: 1, role: 'ADMIN', username: ADMIN_USERNAME },
        getRequiredServerEnv('JWT_SECRET'),
        { expiresIn: '7d' }
      );

      // 设置认证cookie
      const headers = new Headers();
      setAuthCookie(headers, token);
      headers.set('Content-Type', 'application/json');

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: 1,
          username: ADMIN_USERNAME,
          email: null,
          displayName: ADMIN_USERNAME,
          role: 'ADMIN'
        }
      }), {
        status: 200,
        headers
      });
    }

    // 🆕 然后查找数据库用户（普通用户和数据库管理员）
    const db = createDatabaseConnection();
    const isEmailLogin = isEmail(cleanIdentifier.toLowerCase());
    
    // 查找用户 - 支持用户名和邮箱登录
    const user = await withRetry(async () => {
      if (isEmailLogin) {
        // 邮箱登录
        return await db.user.findUnique({
          where: { email: cleanIdentifier.toLowerCase() },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
            role: true,
            displayName: true,
            createdAt: true
          }
        });
      } else {
        // 用户名登录
        return await db.user.findUnique({
          where: { username: cleanIdentifier },
          select: {
            id: true,
            username: true,
            email: true,
            password: true,
            role: true,
            displayName: true,
            createdAt: true
          }
        });
      }
    }, 'Find user for login');

    if (!user) {
      console.log('❌ User not found:', cleanIdentifier);
      return new Response(
        JSON.stringify({ error: 'Invalid username/email or password' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证密码
    const isPasswordValid = verifyPassword(cleanPassword, user.password);
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', user.username);
      return new Response(
        JSON.stringify({ error: 'Invalid username/email or password' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User login successful:', user.username, 'Role:', user.role);

    // 更新最后登录时间
    await withRetry(async () => {
      return await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });
    }, 'Update last login time');

    // 生成JWT token
    const tokenPayload = {
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email
    };

    const token = jwt.sign(
      tokenPayload,
      getRequiredServerEnv('JWT_SECRET'),
      { expiresIn: '7d' }
    );

    // 设置认证cookie
    const headers = new Headers();
    setAuthCookie(headers, token);
    headers.set('Content-Type', 'application/json');

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    }), {
      status: 200,
      headers
    });

  } catch (error: any) {
    console.error('Login error:', error);
    
    return new Response(
      JSON.stringify({ error: 'Login failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
