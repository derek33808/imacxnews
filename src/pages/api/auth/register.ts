export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import { setAuthCookie } from '../../../lib/auth';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
import { sendWelcomeEmail } from '../../../lib/email';

// 邮箱格式验证函数
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 简单密码验证（最少6个字符）
function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

// 使用crypto进行密码哈希（临时方案，建议后续使用bcrypt）
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(password + salt).digest('hex');
  return `${salt}:${hash}`;
}

// 验证密码
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const computedHash = createHash('sha256').update(password + salt).digest('hex');
  return hash === computedHash;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, email, password, displayName } = body;

    // 输入验证
    if (!username || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Username, email, and password are required' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 清理输入数据
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanDisplayName = displayName?.trim() || null;

    // 验证邮箱格式
    if (!isValidEmail(cleanEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证密码强度
    if (!isValidPassword(password)) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证用户名长度
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return new Response(
        JSON.stringify({ error: 'Username must be between 3 and 30 characters' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const db = createDatabaseConnection();

    // 检查用户名和邮箱是否已存在
    const existingUser = await withRetry(async () => {
      return await db.user.findFirst({
        where: {
          OR: [
            { username: cleanUsername },
            { email: cleanEmail }
          ]
        },
        select: { username: true, email: true }
      });
    }, 'Check existing user');

    if (existingUser) {
      const duplicateField = existingUser.username === cleanUsername ? 'username' : 'email';
      return new Response(
        JSON.stringify({ error: `This ${duplicateField} is already registered` }), 
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建新用户
    const hashedPassword = hashPassword(password);
    const newUser = await withRetry(async () => {
      return await db.user.create({
        data: {
          username: cleanUsername,
          email: cleanEmail,
          password: hashedPassword,
          displayName: cleanDisplayName,
          role: 'USER',
          lastLoginAt: new Date()
        },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true
        }
      });
    }, 'Create new user');

    // 生成JWT token
    const tokenPayload = {
      id: newUser.id,
      role: newUser.role,
      username: newUser.username,
      email: newUser.email
    };

    const token = jwt.sign(
      tokenPayload,
      import.meta.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 设置认证cookie
    const headers = new Headers();
    setAuthCookie(headers, token);
    headers.set('Content-Type', 'application/json');

    // 异步发送欢迎邮件（不阻塞响应）
    sendWelcomeEmail(newUser.email, newUser.username, newUser.displayName).catch(error => {
      console.error('Failed to send welcome email:', error);
      // 邮件发送失败不影响注册流程，只记录错误
    });

    console.log(`🎉 User registered successfully: ${newUser.username} (${newUser.email})`);

    return new Response(JSON.stringify({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role
      }
    }), {
      status: 201,
      headers
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    
    // 处理数据库约束错误
    if (error.code === 'P2002') {
      const field = error.meta?.target?.includes('email') ? 'email' : 'username';
      return new Response(
        JSON.stringify({ error: `This ${field} is already registered` }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Registration failed. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// 导出密码验证函数供登录API使用
export { verifyPassword };
