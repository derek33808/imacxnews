import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { generateDailyNewsletterHTML, generateEmailSubject, generatePlainTextVersion } from '../../../lib/email-utils';

const prisma = new PrismaClient();

// Resend 邮件发送（如果你还没安装，需要先运行: npm install resend）
// 如果暂时不用 Resend，可以先注释掉这行，使用模拟发送
// import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 验证请求来源（安全检查）
    const authHeader = request.headers.get('authorization');
    const expectedToken = `Bearer ${import.meta.env.CRON_SECRET || 'imacx-newsletter-2024-secret'}`;
    
    if (authHeader !== expectedToken) {
      console.log('❌ Unauthorized newsletter send attempt');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'UNAUTHORIZED',
        message: 'Invalid authorization token' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('🚀 Starting daily newsletter send process...');
    console.log('📅 Current time:', new Date().toISOString());

    // 获取今天发布的文章
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    console.log('🔍 Newsletter daily send called');

    // 🔧 临时简化版本 - 只记录日志，不进行数据库操作
    console.log('📧 Daily newsletter send requested, but database operations are disabled');
    
    // 模拟找到文章和订阅者
    const mockArticlesCount = 0;
    const mockSubscribersCount = 0;

    console.log('📧 Mock daily newsletter send completed');
    return new Response(JSON.stringify({ 
      success: true, 
      skipped: true,
      message: 'Newsletter feature is being set up. No emails sent today.',
      stats: {
        articlesFound: mockArticlesCount,
        emailsSent: 0,
        subscribersFound: mockSubscribersCount
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

    /* 🔧 以下代码已临时禁用，等待数据库表创建完成后启用
    
    // 生成邮件内容
    const emailSubject = generateEmailSubject(todayArticles);
    console.log('📧 Email subject:', emailSubject);

    // 检查环境变量
    const resendApiKey = import.meta.env.RESEND_API_KEY;
    const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'IMACX News <newsletter@imacxnews.com>';

    let emailResults: any[] = [];
    let successCount = 0;
    let errorCount = 0;

    if (resendApiKey) {
      // 使用 Resend 发送真实邮件
      console.log('📤 Sending emails via Resend...');
      
      try {
        // 动态导入 Resend
        const { Resend } = await import('resend');
        const resend = new Resend(resendApiKey);

        // 批量发送邮件
        const emailPromises = subscribers.map(async (subscriber) => {
          try {
            const htmlContent = generateDailyNewsletterHTML(todayArticles, subscriber);
            const textContent = generatePlainTextVersion(todayArticles, subscriber);

            const result = await resend.emails.send({
              from: fromEmail,
              to: subscriber.email,
              subject: emailSubject,
              html: htmlContent,
              text: textContent,
            });

            console.log(`✅ Email sent to ${subscriber.email}:`, result.data?.id);
            successCount++;
            return { 
              email: subscriber.email, 
              success: true, 
              messageId: result.data?.id 
            };

          } catch (error: any) {
            console.error(`❌ Failed to send email to ${subscriber.email}:`, error);
            errorCount++;
            return { 
              email: subscriber.email, 
              success: false, 
              error: error.message 
            };
          }
        });

        emailResults = await Promise.all(emailPromises);

      } catch (importError) {
        console.error('❌ Failed to import Resend:', importError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'RESEND_IMPORT_FAILED',
          message: 'Failed to load email service. Please check Resend installation.'
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

    } else {
      // 模拟发送（开发环境）
      console.log('🧪 Simulating email send (no RESEND_API_KEY found)...');
      
      emailResults = subscribers.map((subscriber) => {
        console.log(`📧 [SIMULATE] Would send to: ${subscriber.email}`);
        successCount++;
        return { 
          email: subscriber.email, 
          success: true, 
          simulated: true,
          messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      });
    }

    // 记录发送日志到数据库
    try {
      await prisma.emailSendLog.create({
        data: {
          recipientCount: successCount,
          articleIds: todayArticles.map(a => a.id),
          subject: emailSubject,
          status: errorCount === 0 ? 'sent' : 'partial',
          errorMessage: errorCount > 0 ? `${errorCount} emails failed` : null
        }
      });
      console.log('📝 Send log recorded to database');
    } catch (logError) {
      console.error('⚠️ Failed to record send log:', logError);
    }

    const finalResult = {
      success: true,
      message: `Newsletter sent successfully!`,
      stats: {
        articlesFound: todayArticles.length,
        subscribersFound: subscribers.length,
        emailsSent: successCount,
        emailsFailed: errorCount,
        subject: emailSubject
      },
      articles: todayArticles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug
      })),
      results: emailResults
    };

    console.log('🎉 Newsletter send completed:', finalResult.stats);
    
    return new Response(JSON.stringify(finalResult), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Daily newsletter send failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'SEND_FAILED',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
  */

  } catch (error: any) {
    console.error('❌ Daily newsletter send failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'SEND_FAILED',
      message: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
