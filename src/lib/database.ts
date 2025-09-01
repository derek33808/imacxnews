// 数据库连接管理 - 包含重试机制、智能备用和连接优化
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;
let connectionHealthy = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30秒

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 2, // 减少重试次数，提高响应速度
  retryDelay: 800, // 减少延迟
  backoffMultiplier: 1.5
};

// 连接池配置
const CONNECTION_CONFIG = {
  log: ['warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
};

// 创建优化的数据库连接
export function createDatabaseConnection() {
  if (!prisma) {
    prisma = new PrismaClient(CONNECTION_CONFIG);
  }
  return prisma;
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
                               lastError.message.includes("connection pool");
      
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
    await prisma.$disconnect();
    prisma = null;
  }
}
