export const prerender = false;
import type { APIRoute } from 'astro';
import { createDatabaseConnection, withRetry, checkDatabaseHealth } from '../../lib/database';

export const GET: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    // 检查环境变量
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'DATABASE_URL environment variable is not set',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 检查数据库连接
    const isHealthy = await checkDatabaseHealth();
    
    if (!isHealthy) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Database connection failed',
        databaseUrl: databaseUrl.replace(/\/\/.*:.*@/, '//***:***@'), // 隐藏密码
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 获取数据库统计信息
    const prisma = createDatabaseConnection();
    
    const stats = await withRetry(async () => {
      const [userCount, articleCount, sampleArticle] = await Promise.all([
        prisma.user.count(),
        prisma.article.count(),
        prisma.article.findFirst({
          select: { title: true, author: true, publishDate: true },
          orderBy: { publishDate: 'desc' }
        })
      ]);
      
      return { userCount, articleCount, sampleArticle };
    }, 'Database statistics');

    return new Response(JSON.stringify({
      status: 'success',
      message: 'Database connection is healthy',
      databaseUrl: databaseUrl.replace(/\/\/.*:.*@/, '//***:***@'), // 隐藏密码
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        DISABLE_DATABASE: process.env.DISABLE_DATABASE,
        ENABLE_SMART_FALLBACK: process.env.ENABLE_SMART_FALLBACK
      },
      statistics: stats,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Database health check failed',
      error: error.message,
      databaseUrl: process.env.DATABASE_URL?.replace(/\/\/.*:.*@/, '//***:***@') || 'Not set',
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};