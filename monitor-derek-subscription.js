#!/usr/bin/env node

/**
 * Derek用户订阅状态监控脚本
 * 定期检查Derek用户的订阅状态，并记录任何异常变化
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const prisma = new PrismaClient();

const LOG_FILE = 'derek-subscription-monitor.log';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟检查一次

async function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  try {
    await fs.appendFile(LOG_FILE, logEntry);
  } catch (error) {
    console.error('写入日志失败:', error);
  }
  
  console.log(logEntry.trim());
}

async function checkDerekSubscription() {
  try {
    // 查找Derek用户及其订阅状态
    const derek = await prisma.user.findUnique({
      where: { id: 8 }, // Derek的用户ID
      include: {
        subscriptions: true
      }
    });

    if (!derek) {
      await logMessage('❌ 错误: 找不到Derek用户 (ID: 8)');
      return null;
    }

    const subscription = derek.subscriptions[0];
    
    if (!subscription) {
      await logMessage('❌ 错误: Derek用户没有订阅记录');
      return null;
    }

    const status = {
      userId: derek.id,
      username: derek.username,
      email: derek.email,
      subscriptionId: subscription.id,
      isActive: subscription.isActive,
      lastUpdated: subscription.updatedAt,
      source: subscription.source,
      unsubscribeToken: subscription.unsubscribeToken
    };

    return status;

  } catch (error) {
    await logMessage(`❌ 检查订阅状态时出错: ${error.message}`);
    return null;
  }
}

async function monitorDerekSubscription() {
  await logMessage('🚀 开始监控Derek用户订阅状态...');
  
  let lastStatus = null;
  
  const checkStatus = async () => {
    const currentStatus = await checkDerekSubscription();
    
    if (!currentStatus) {
      return;
    }
    
    // 第一次检查或状态发生变化
    if (!lastStatus || 
        lastStatus.isActive !== currentStatus.isActive ||
        lastStatus.lastUpdated.getTime() !== currentStatus.lastUpdated.getTime()) {
      
      const statusEmoji = currentStatus.isActive ? '✅' : '❌';
      const changeInfo = lastStatus ? 
        `状态变化: ${lastStatus.isActive ? '活跃' : '非活跃'} → ${currentStatus.isActive ? '活跃' : '非活跃'}` :
        '初始状态检查';
        
      await logMessage(
        `${statusEmoji} Derek订阅状态 - ${changeInfo} | ` +
        `邮箱: ${currentStatus.email} | ` +
        `订阅ID: ${currentStatus.subscriptionId} | ` +
        `更新时间: ${currentStatus.lastUpdated} | ` +
        `来源: ${currentStatus.source}`
      );
      
      // 如果订阅被取消，尝试自动重新激活
      if (!currentStatus.isActive && lastStatus && lastStatus.isActive) {
        await logMessage('⚠️ 检测到Derek用户订阅被自动取消，尝试重新激活...');
        
        try {
          await prisma.newsSubscription.update({
            where: { id: currentStatus.subscriptionId },
            data: {
              isActive: true,
              updatedAt: new Date(),
              source: 'auto_restored' // 标记为自动恢复
            }
          });
          
          await logMessage('✅ 已自动重新激活Derek用户的订阅');
          
          // 重新检查状态
          const restoredStatus = await checkDerekSubscription();
          if (restoredStatus && restoredStatus.isActive) {
            await logMessage('✅ 确认订阅恢复成功');
            currentStatus.isActive = true; // 更新当前状态
          }
          
        } catch (restoreError) {
          await logMessage(`❌ 自动恢复订阅失败: ${restoreError.message}`);
        }
      }
    }
    
    lastStatus = currentStatus;
  };
  
  // 立即执行一次检查
  await checkStatus();
  
  // 设置定期检查
  setInterval(checkStatus, CHECK_INTERVAL);
  
  await logMessage(`⏰ 监控已启动，每${CHECK_INTERVAL / 1000 / 60}分钟检查一次`);
}

// 优雅关闭
process.on('SIGINT', async () => {
  await logMessage('🛑 监控程序收到停止信号，正在关闭...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await logMessage('🛑 监控程序收到终止信号，正在关闭...');
  await prisma.$disconnect();
  process.exit(0);
});

// 启动监控
monitorDerekSubscription().catch(async (error) => {
  await logMessage(`❌ 监控程序出现致命错误: ${error.message}`);
  console.error('监控程序出现致命错误:', error);
  await prisma.$disconnect();
  process.exit(1);
});
