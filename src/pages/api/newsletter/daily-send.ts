import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { generateDailyNewsletterHTML, generateEmailSubject, generatePlainTextVersion } from '../../../lib/email-utils';
import { emailScheduler } from '../../../lib/email-scheduler';
import { sendEmail } from '../../../lib/email';

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

    console.log('🚀 Starting newsletter send process...');
    console.log('📅 Current time:', new Date().toISOString());
    
    // 检查调度配置
    const config = emailScheduler.getConfig();
    console.log('⚙️ Email scheduler config:', {
      frequency: config.schedule.frequency,
      sendTime: config.schedule.sendTime,
      timezone: config.schedule.timezone,
      shouldSendToday: config.shouldSendToday,
      isScheduledTime: config.isScheduledTime,
      nextScheduledTime: config.nextScheduledTime
    });

    // 验证配置
    const configValidation = emailScheduler.validateConfig();
    if (!configValidation.valid) {
      console.error('❌ Invalid email scheduler configuration:', configValidation.errors);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'INVALID_CONFIG',
        message: 'Email scheduler configuration is invalid',
        errors: configValidation.errors
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查是否应该今天发送（但允许强制发送）
    const forceImmediate = request.headers.get('x-force-immediate') === 'true' || 
                          request.url.includes('force=true');
    
    if (!config.shouldSendToday && !forceImmediate) {
      console.log(`📧 Newsletter not scheduled for today (${config.schedule.frequency} frequency)`);
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        message: `Newsletter not scheduled for today. Next send: ${config.nextScheduledTime.toISOString()}`,
        nextScheduledTime: config.nextScheduledTime.toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (forceImmediate) {
      console.log('🚀 Force immediate send enabled - bypassing schedule check');
    }

    // 获取今天发布的文章
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    console.log('🔍 Newsletter daily send called');

    // 获取今天发布的文章（如果强制发送，则获取最新的文章）
    let todayArticles;
    
    if (forceImmediate) {
      // 强制发送时，获取最近发布的文章
      console.log('🔄 Force mode: Getting latest articles instead of today only');
      todayArticles = await prisma.article.findMany({
        orderBy: { publishDate: 'desc' },
        take: 5, // 获取最新5篇文章
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          image: true,
          author: true,
          publishDate: true,
          category: true
        }
      });
    } else {
      // 正常模式：只获取今天发布的文章
      todayArticles = await prisma.article.findMany({
        where: {
          publishDate: {
            gte: startOfDay,
            lt: endOfDay
          }
        },
        orderBy: { publishDate: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          image: true,
          author: true,
          publishDate: true,
          category: true
        }
      });
    }

    console.log(`📰 Found ${todayArticles.length} articles to send`);

    if (todayArticles.length === 0) {
      console.log('📧 No articles found for newsletter');
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        message: 'No articles found to send in newsletter.',
        stats: {
          articlesFound: 0,
          emailsSent: 0,
          subscribersFound: 0
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 获取活跃的订阅者
    const subscribers = await prisma.newsSubscription.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: {
            username: true,
            displayName: true
          }
        }
      }
    });

    console.log(`👥 Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      console.log('📧 No active subscribers found');
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true,
        message: 'No active subscribers found.',
        stats: {
          articlesFound: todayArticles.length,
          emailsSent: 0,
          subscribersFound: 0
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
};
