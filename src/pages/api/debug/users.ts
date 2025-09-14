export const prerender = false;
import type { APIRoute } from 'astro';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

export const GET: APIRoute = async ({ request }) => {
  try {
    const db = createDatabaseConnection();
    
    // 获取所有用户信息（不包含密码）
    const users = await withRetry(async () => {
      return await db.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          displayName: true,
          createdAt: true,
          lastLoginAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }, 'Fetch all users');

    return new Response(JSON.stringify({
      success: true,
      count: users.length,
      users: users
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Debug users error:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch users',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
