import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../../../lib/auth';
import { sendNewsletterUnsubscriptionConfirmation } from '../../../lib/email';

const prisma = new PrismaClient();

// 通过用户登录取消订阅
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📧 Processing newsletter unsubscribe request...');
    
    const user = getUserFromRequest(request);
    console.log('🔍 User from request:', user ? { id: user.id, username: user.username } : 'null');
    
    if (!user) {
      console.log('❌ No user found in request, returning LOGIN_REQUIRED');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOGIN_REQUIRED',
        message: 'Please login to manage your subscription' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`📧 Newsletter unsubscribe request from user: ${user.username} (ID: ${user.id})`);

    // 查找用户的订阅
    console.log(`🔍 Looking for subscription for user ID: ${user.id}`);
    const subscription = await prisma.newsSubscription.findUnique({
      where: { userId: user.id }
    });
    
    console.log('📊 Subscription found:', subscription ? {
      id: subscription.id,
      email: subscription.email,
      isActive: subscription.isActive,
      source: subscription.source
    } : 'null');

    if (!subscription) {
      console.log('❌ No subscription found for user');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'You are not subscribed to our newsletter.',
        notSubscribed: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!subscription.isActive) {
      console.log('ℹ️ Subscription already inactive');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'You have already unsubscribed from our newsletter.',
        alreadyUnsubscribed: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 取消订阅（设置为非活跃状态）
    console.log('🔄 Updating subscription to inactive...');
    const updatedSubscription = await prisma.newsSubscription.update({
      where: { userId: user.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Subscription updated successfully:', {
      id: updatedSubscription.id,
      isActive: updatedSubscription.isActive,
      updatedAt: updatedSubscription.updatedAt
    });

    // 发送取消订阅确认邮件（异步，不阻塞响应）
    try {
      await sendNewsletterUnsubscriptionConfirmation(
        subscription.email, 
        user.username, 
        user.displayName || user.username
      );
      console.log('📧 Unsubscription confirmation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send newsletter unsubscription confirmation:', emailError);
      // 不因为邮件发送失败而阻止取消订阅成功
    }

    console.log(`✅ Newsletter unsubscription successful for user: ${user.username} (${subscription.email})`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Successfully unsubscribed from IMACX News Newsletter. We\'ll miss you! 😢' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Newsletter unsubscribe error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'UNSUBSCRIBE_FAILED',
      message: 'Failed to unsubscribe. Please try again later.',
      debug: import.meta.env.DEV ? (error instanceof Error ? error.message : String(error)) : undefined
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
};

// 通过令牌取消订阅（邮件中的链接）
export const GET: APIRoute = async ({ url }) => {
  try {
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Link - IMACX News</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background: #f8f9fa;">
            <h1 style="color: #dc3545;">❌ Invalid Unsubscribe Link</h1>
            <p>This unsubscribe link is invalid or has expired.</p>
            <a href="https://imacxnews.com" style="color: #1a73e8; text-decoration: none; font-weight: 500;">← Return to IMACX News</a>
          </body>
        </html>
      `, { 
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    console.log(`📧 Newsletter unsubscribe via token: ${token}`);

    // 查找订阅记录
    const subscription = await prisma.newsSubscription.findUnique({
      where: { unsubscribeToken: token },
      include: {
        user: true
      }
    });

    if (!subscription) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Unsubscribe Link - IMACX News</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background: #f8f9fa;">
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <h1 style="color: #dc3545;">❌ Invalid Unsubscribe Link</h1>
              <p>This unsubscribe link is invalid or has expired.</p>
              <a href="https://imacxnews.com" style="color: #1a73e8; text-decoration: none; font-weight: 500;">← Return to IMACX News</a>
            </div>
          </body>
        </html>
      `, { 
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const isAlreadyUnsubscribed = !subscription.isActive;

    // 如果还没有取消订阅，则取消订阅
    if (subscription.isActive) {
      await prisma.newsSubscription.update({
        where: { id: subscription.id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      // 发送取消订阅确认邮件（异步，不阻塞响应）
      sendNewsletterUnsubscriptionConfirmation(
        subscription.email, 
        subscription.user.username, 
        subscription.user.displayName
      ).catch(error => {
        console.error('Failed to send newsletter unsubscription confirmation:', error);
      });

      console.log(`❌ Newsletter unsubscription via token successful for user: ${subscription.user.username} (${subscription.email})`);
    }

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Unsubscribed Successfully - IMACX News</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background: #f8f9fa;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h1 style="color: #28a745; margin-bottom: 20px;">
              ${isAlreadyUnsubscribed ? '✅ Already Unsubscribed' : '✅ Successfully Unsubscribed'}
            </h1>
            <p style="font-size: 18px; color: #333; margin-bottom: 10px;">
              Hi ${subscription.user.displayName || subscription.user.username},
            </p>
            <p style="color: #666; margin-bottom: 20px;">
              ${isAlreadyUnsubscribed 
                ? 'You have already been unsubscribed from our newsletter.' 
                : 'You have been successfully unsubscribed from IMACX News Newsletter.'}
            </p>
            <p style="color: #999; margin-bottom: 30px;">We're sorry to see you go! 😢</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                📅 ${isAlreadyUnsubscribed ? 'Previously unsubscribed' : 'Unsubscribed'}: ${new Date().toLocaleDateString()}
              </p>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                📧 Email: ${subscription.email}
              </p>
            </div>

            <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1a73e8;">
              <h3 style="color: #1a73e8; margin: 0 0 10px 0;">💡 Changed your mind?</h3>
              <p style="color: #333; margin: 0; font-size: 14px;">
                You can always resubscribe by visiting our website and signing up for the newsletter again.
              </p>
            </div>
            
            <div style="margin-top: 30px;">
              <a href="https://imacxnews.com" 
                 style="background: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block; margin-right: 10px;">
                🏠 Return to IMACX News
              </a>
            </div>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Token unsubscribe error:', error);
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - IMACX News</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; background: #f8f9fa;">
          <h1 style="color: #dc3545;">❌ Something went wrong</h1>
          <p>We encountered an error while processing your unsubscribe request.</p>
          <p>Please try again later or contact support.</p>
          <a href="https://imacxnews.com" style="color: #1a73e8; text-decoration: none; font-weight: 500;">← Return to IMACX News</a>
        </body>
      </html>
    `, { 
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    });
  }
};
