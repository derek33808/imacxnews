import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../../../lib/auth';
import { sendNewsletterSubscriptionConfirmation } from '../../../lib/email';
import { randomBytes } from 'crypto';

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

    console.log(`📧 Newsletter subscription request from user: ${user.username}, source: ${source}`);

    // 检查是否已经订阅
    const existingSubscription = await prisma.newsSubscription.findUnique({
      where: { userId: user.id }
    });

    let subscription;
    
    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'You are already subscribed to our newsletter! 📬',
          alreadySubscribed: true
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // 重新激活已存在的订阅
        subscription = await prisma.newsSubscription.update({
          where: { userId: user.id },
          data: {
            isActive: true,
            source: source,
            updatedAt: new Date()
          }
        });
      }
    } else {
      // 创建新的订阅
      const unsubscribeToken = randomBytes(32).toString('hex');
      
      subscription = await prisma.newsSubscription.create({
        data: {
          userId: user.id,
          email: user.email,
          isActive: true,
          unsubscribeToken: unsubscribeToken,
          source: source
        }
      });
    }

    // 生成取消订阅链接
    const unsubscribeUrl = `https://imacxnews.com/api/newsletter/unsubscribe?token=${subscription.unsubscribeToken}`;

    // 发送订阅确认邮件（异步，不阻塞响应）
    sendNewsletterSubscriptionConfirmation(
      user.email, 
      user.username, 
      unsubscribeUrl,
      user.displayName
    ).catch(error => {
      console.error('Failed to send newsletter subscription confirmation:', error);
    });

    console.log(`✅ Newsletter subscription successful for user: ${user.username} (${user.email})`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully subscribed to IMACX News Newsletter! Check your email for confirmation. 📬',
      subscription: {
        id: subscription.id,
        source: subscription.source,
        subscribedAt: subscription.createdAt
      }
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

    console.log(`📧 Newsletter status check for user: ${user.username}`);

    // 检查用户的订阅状态
    const subscription = await prisma.newsSubscription.findUnique({
      where: { userId: user.id }
    });

    const isSubscribed = subscription ? subscription.isActive : false;

    return new Response(JSON.stringify({ 
      subscribed: isSubscribed,
      email: user.email,
      subscription: subscription ? {
        id: subscription.id,
        source: subscription.source,
        subscribedAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      } : null
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
