import type { APIRoute } from 'astro';
import { generateDailyNewsletterHTML, generateEmailSubject, generatePlainTextVersion } from '../../../lib/email-utils';
import { emailScheduler } from '../../../lib/email-scheduler';
import { sendEmail } from '../../../lib/email';
import { createDatabaseConnection, withRetry } from '../../../lib/database';


// Resend 邮件发送（如果你还没安装，需要先运行: npm install resend）
// 如果暂时不用 Resend，可以先注释掉这行，使用模拟发送
// import { Resend } from 'resend';

export const POST: APIRoute = async ({ request }) => {
  const prisma = createDatabaseConnection();

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

    const urlObj = new URL(request.url);

    // 解析目标文章ID（用于立即发送特定文章）
    let targetArticleIds: number[] | null = null;
    try {
      if (request.headers.get('content-type')?.includes('application/json')) {
        const body = await request.json().catch(() => null);
        if (body && Array.isArray(body.articleIds)) {
          targetArticleIds = body.articleIds.map((x: any) => Number(x)).filter((x: number) => Number.isFinite(x));
        } else if (body && Number.isFinite(body.articleId)) {
          targetArticleIds = [Number(body.articleId)];
        }
      }
    } catch {}

    // 支持从查询参数读取单个 articleId（可选）
    if (!targetArticleIds) {
      const qId = urlObj.searchParams.get('articleId');
      if (qId && Number.isFinite(Number(qId))) {
        targetArticleIds = [Number(qId)];
      }
      const qIds = urlObj.searchParams.getAll('articleIds');
      if (!targetArticleIds && qIds && qIds.length > 0) {
        const parsed = qIds
          .flatMap((v) => v.split(','))
          .map((x) => Number(x))
          .filter((x) => Number.isFinite(x));
        if (parsed.length > 0) targetArticleIds = parsed;
      }
    }

    // 检查是否应该今天发送（但允许强制发送）
    const forceImmediate = request.headers.get('x-force-immediate') === 'true' || 
                          urlObj.searchParams.get('force') === 'true' ||
                          !!targetArticleIds;
    const forceToday = request.headers.get('x-force-today') === 'true' ||
                      urlObj.searchParams.get('forceToday') === 'true' ||
                      urlObj.searchParams.get('mode') === 'today';
    const forceSend = forceImmediate || forceToday;
    
    if (!config.shouldSendToday && !forceSend) {
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

    if (forceImmediate && !forceToday) {
      console.log('🚀 Force immediate send enabled - bypassing schedule check');
    }
    if (forceToday) {
      console.log('📅 Force today send enabled - bypassing schedule check');
    }

    // 获取今天发布的文章
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    console.log('🔍 Newsletter daily send called');

    // 获取今天发布的文章（如果强制发送，则获取最新或指定的文章）
    let todayArticles;
    
    if (targetArticleIds && targetArticleIds.length > 0) {
      console.log('🔄 Force mode: Using specified articleIds for immediate send', targetArticleIds);
      todayArticles = await withRetry(async () => {
        return await prisma.article.findMany({
          where: { id: { in: targetArticleIds } },
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
      }, 'Fetch newsletter articles by ID');
    } else if (forceToday) {
      console.log('🔄 Force today: Using today-only articles');
      todayArticles = await withRetry(async () => {
        return await prisma.article.findMany({
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
      }, 'Fetch today newsletter articles');
    } else if (forceImmediate) {
      // 强制发送但未指定ID时，获取最近发布的文章
      console.log('🔄 Force mode: Getting latest articles instead of today only');
      todayArticles = await withRetry(async () => {
        return await prisma.article.findMany({
          orderBy: { publishDate: 'desc' },
          take: 5,
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
      }, 'Fetch latest newsletter articles');
    } else {
      // 正常模式：只获取今天发布的文章
      todayArticles = await withRetry(async () => {
        return await prisma.article.findMany({
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
      }, 'Fetch scheduled newsletter articles');
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
    const subscribers = await withRetry(async () => {
      return await prisma.newsSubscription.findMany({
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
    }, 'Fetch newsletter subscribers');

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
            const subForEmail = {
              id: (subscriber as any).id,
              email: (subscriber as any).email,
              unsubscribeToken: (subscriber as any).unsubscribeToken,
              user: {
                username: (subscriber as any).user?.username,
                displayName: (subscriber as any).user?.displayName
              }
            } as any;
            const htmlContent = generateDailyNewsletterHTML(todayArticles as any, subForEmail);
            const textContent = generatePlainTextVersion(todayArticles as any, subForEmail);

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
        const subForEmail = {
          id: (subscriber as any).id,
          email: (subscriber as any).email,
          unsubscribeToken: (subscriber as any).unsubscribeToken,
          user: {
            username: (subscriber as any).user?.username,
            displayName: (subscriber as any).user?.displayName
          }
        } as any;
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

    // 记录发送日志到数据库（兼容 prisma client 表名映射）
    try {
      // 优先使用 prisma.emailSendLog，如果不存在则使用 prisma["email_send_log"]
      const logData = {
        recipientCount: successCount,
        articleIds: todayArticles.map(a => a.id),
        subject: emailSubject,
        status: errorCount === 0 ? 'sent' : 'partial',
        errorMessage: errorCount > 0 ? `${errorCount} emails failed` : null
      } as any;
      const clientAny: any = prisma as any;
      if (clientAny.emailSendLog?.create) {
        await withRetry(async () => {
          return await clientAny.emailSendLog.create({ data: logData });
        }, 'Create email send log');
      } else if (clientAny.email_send_log?.create) {
        await withRetry(async () => {
          return await clientAny.email_send_log.create({ data: logData });
        }, 'Create email send log');
      } else {
        console.warn('⚠️ EmailSendLog model not available on Prisma client');
      }
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
    const rawMessage = error?.message || 'Unknown error occurred';
    const isDbError = rawMessage.includes("Can't reach database server") ||
      rawMessage.includes('connection pool') ||
      rawMessage.includes('Timed out') ||
      rawMessage.includes('timeout') ||
      rawMessage.includes('Connection terminated');
    const message = isDbError
      ? 'Database connection failed. Please verify database availability and credentials.'
      : rawMessage;

    console.error('❌ Daily newsletter send failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'SEND_FAILED',
      message,
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
