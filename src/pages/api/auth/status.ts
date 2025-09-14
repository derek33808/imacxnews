export const prerender = false;
import type { APIRoute } from 'astro';
import pkg from 'jsonwebtoken';
import { createDatabaseConnection, withRetry } from '../../../lib/database';
const { verify } = pkg;

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-for-development';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // 从cookie中获取JWT token
    const token = cookies.get('token')?.value;
    
    console.log('🔍 Status API - Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No authentication token found',
        user: null
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证JWT token
    const decoded = verify(token, JWT_SECRET) as any;
    console.log('✅ Status API - Token verified for user:', decoded.username);
    
    // 从数据库获取完整的用户信息
    const db = createDatabaseConnection();
    const user = await withRetry(async () => {
      return await db.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          role: true,
          createdAt: true,
          lastLoginAt: true
        }
      });
    }, 'Get user for status');

    if (!user) {
      console.log('❌ User not found in database:', decoded.id);
      return new Response(JSON.stringify({
        success: false,
        message: 'User not found',
        user: null
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 返回完整的用户信息
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    };

    console.log('✅ Status API - Complete user data returned for:', user.username);

    return new Response(JSON.stringify({
      success: true,
      user: userData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Status API error:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Invalid or expired token',
      user: null
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};