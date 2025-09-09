// 数据库连接管理 - 包含重试机制、智能备用和连接优化
import { PrismaClient, type Prisma } from '@prisma/client';

let prisma: PrismaClient | null = null;
let connectionHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30秒

// 重试配置 - 针对连接池问题优化
const RETRY_CONFIG = {
  maxRetries: 3, // 增加重试次数以处理连接池耗尽
  retryDelay: 1000, // 增加延迟给连接池时间恢复
  backoffMultiplier: 2.0 // 更积极的退避策略
};

// 优化的连接池配置 - 针对 Netlify + Supabase Pooler
const CONNECTION_CONFIG: Prisma.PrismaClientOptions = {
  log: process.env.NODE_ENV === 'production' ? ['warn', 'error'] : ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      // 🔧 修复连接池配置 - 增加连接限制和超时时间
      url: process.env.DATABASE_URL?.replace('connection_limit=1', 'connection_limit=10')
                                   ?.replace('sslmode=require', 'pool_timeout=20&sslmode=require') || process.env.DATABASE_URL
    }
  },
  // 🔧 增强的事务和连接配置
  transactionOptions: {
    maxWait: 10000,     // 增加等待事务的最大时间到10秒
    timeout: 15000,     // 增加事务超时时间到15秒
  }
};

// 创建优化的数据库连接
export function createDatabaseConnection() {
  if (!prisma) {
    prisma = new PrismaClient(CONNECTION_CONFIG);
    
    // 🔧 添加连接生命周期管理
    process.on('beforeExit', async () => {
      console.log('🔌 Gracefully disconnecting Prisma Client...');
      await closeDatabaseConnection();
    });
  }
  return prisma;
}

// 🔧 强制释放所有连接的函数
export async function forceReleaseConnections() {
  if (prisma) {
    try {
      console.log('🔄 Force releasing database connections...');
      await prisma.$disconnect();
      prisma = null;
      console.log('✅ Database connections released');
      // 重新创建连接
      prisma = new PrismaClient(CONNECTION_CONFIG);
    } catch (error) {
      console.error('❌ Error during force release:', error);
      prisma = null;
    }
  }
}

// 检查是否启用智能备用模式
export function isSmartFallbackEnabled(): boolean {
  return process.env.ENABLE_SMART_FALLBACK === 'true';
}

// 获取连接健康状态
export function getConnectionHealth(): boolean {
  return connectionHealthy;
}

// 带重试机制和智能备用的数据库操作包装器
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: string = 'Database operation',
  fallbackValue?: T
): Promise<T> {
  let lastError: Error;
  
  // 快速失败：如果连接状态不健康且启用了智能备用
  if (!connectionHealthy && isSmartFallbackEnabled() && fallbackValue !== undefined) {
    console.warn(`🔄 Using fallback for ${context} due to unhealthy connection`);
    return fallbackValue;
  }
  
  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // 如果之前连接不健康，现在成功了，更新状态
      if (!connectionHealthy) {
        connectionHealthy = true;
        console.log(`💚 Database connection restored for: ${context}`);
      }
      
      // 如果是重试后成功，记录恢复信息
      if (attempt > 1) {
        console.log(`✅ ${context} succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      const isConnectionError = lastError.message.includes("Can't reach database server") ||
                               lastError.message.includes("Connection terminated") ||
                               lastError.message.includes("timeout") ||
                               lastError.message.includes("connection pool") ||
                               lastError.message.includes("Timed out fetching") ||
                               lastError.message.includes("connection limit") ||
                               lastError.message.includes("pool timeout");
      
      if (isConnectionError) {
        connectionHealthy = false;
      }
      
      if (!isConnectionError || attempt === RETRY_CONFIG.maxRetries) {
        // 非连接错误或已达到最大重试次数
        if (isConnectionError) {
          console.warn(`🔶 ${context} failed after ${attempt} attempt(s), connection marked unhealthy`);
        } else {
          console.error(`❌ ${context} failed after ${attempt} attempt(s):`, lastError.message);
        }
        
        // 如果有备用值且启用了智能备用，使用备用值
        if (isConnectionError && isSmartFallbackEnabled() && fallbackValue !== undefined) {
          console.warn(`🔄 Using fallback for ${context} after connection failure`);
          return fallbackValue;
        }
        
        throw lastError;
      }
      
      // 计算延迟时间（指数退避）
      const delay = RETRY_CONFIG.retryDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
      
      console.warn(`⚠️  ${context} failed on attempt ${attempt}, retrying in ${delay}ms...`);
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

// 数据库健康检查
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const db = createDatabaseConnection();
    await withRetry(async () => {
      await db.$queryRaw`SELECT 1`;
    }, 'Database health check');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// 优雅关闭数据库连接
export async function closeDatabaseConnection() {
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.warn('Error disconnecting Prisma client:', error);
    } finally {
      prisma = null;
    }
  }
}

// 全局未处理的 Promise 拒绝处理器 (适用于 Node.js 环境)
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Promise Rejection at:', promise, 'reason:', reason);
    // 不要让进程崩溃，但要记录错误
  });
}
