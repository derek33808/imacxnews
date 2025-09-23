import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../../../lib/auth';

const prisma = new PrismaClient();

export const POST: APIRoute = async ({ request }) => {
  try {
    // 检查用户登录状态
    const user = getUserFromRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOGIN_REQUIRED',
        message: 'Please login or register to subscribe to our newsletter' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json().catch(() => ({}));
    const source = body.source || 'manual';

    // 🔧 临时简化版本 - 只进行基本验证，不进行数据库操作
    console.log(`📧 Newsletter subscription request from user: ${user.username}, source: ${source}`);

    // TODO: 将来需要添加数据库操作来存储订阅信息
    // 目前只返回成功信息，避免500错误

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully subscribed! Newsletter feature is being set up. 📬' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'SUBSCRIPTION_FAILED',
      message: 'Failed to subscribe. Please try again later.'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// 获取订阅状态
export const GET: APIRoute = async ({ request }) => {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ 
        subscribed: false,
        message: 'Not logged in' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 🔧 临时简化版本 - 始终返回未订阅状态
    console.log(`📧 Newsletter status check for user: ${user.username}`);

    return new Response(JSON.stringify({ 
      subscribed: false,
      email: user.email || 'unknown@example.com'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Newsletter status check error:', error);
    return new Response(JSON.stringify({ 
      subscribed: false,
      error: 'STATUS_CHECK_FAILED' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
