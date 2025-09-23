import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '../../../lib/auth';

const prisma = new PrismaClient();

// 通过用户登录取消订阅
export const POST: APIRoute = async ({ request }) => {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOGIN_REQUIRED',
        message: 'Please login to manage your subscription' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 🔧 临时简化版本 - 只进行基本验证，不进行数据库操作
    console.log(`📧 Newsletter unsubscribe request from user: ${user.username}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Unsubscribe request received. Newsletter feature is being set up. 😢' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'UNSUBSCRIBE_FAILED',
      message: 'Failed to unsubscribe. Please try again later.'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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

    // 🔧 临时简化版本 - 显示成功页面但不进行数据库操作
    console.log(`📧 Newsletter unsubscribe via token: ${token}`);

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
            <h1 style="color: #28a745; margin-bottom: 20px;">✅ Unsubscribe Request Received</h1>
            <p style="font-size: 18px; color: #333; margin-bottom: 10px;">Hi there,</p>
            <p style="color: #666; margin-bottom: 20px;">Your unsubscribe request has been received. Newsletter feature is being set up.</p>
            <p style="color: #999; margin-bottom: 30px;">We're sorry to see you go! 😢</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #666; font-size: 14px;">
                📅 Request received: ${new Date().toLocaleDateString()}
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
