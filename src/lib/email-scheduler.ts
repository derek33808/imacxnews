// 邮件调度和频率控制工具
import type { EmailOptions } from './email';

export interface EmailScheduleConfig {
  sendTime: string;        // HH:MM format
  timezone: string;        // e.g., "Asia/Shanghai"
  frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
  weeklyDay?: string;      // for weekly: monday, tuesday, etc.
  monthlyDate?: number;    // for monthly: 1-28
}

export interface EmailBatchConfig {
  maxRecipientsPerBatch: number;
  batchDelay: number;      // milliseconds
  retryAttempts: number;
  retryDelay: number;      // milliseconds
}

export interface EmailContentConfig {
  minArticles: number;
  maxArticles: number;
  includeImages: boolean;
}

export class EmailScheduler {
  private scheduleConfig: EmailScheduleConfig;
  private batchConfig: EmailBatchConfig;
  private contentConfig: EmailContentConfig;

  constructor() {
    // 从环境变量读取配置
    this.scheduleConfig = {
      sendTime: import.meta.env.NEWSLETTER_SEND_TIME || '08:00',
      timezone: import.meta.env.NEWSLETTER_TIMEZONE || 'Asia/Shanghai',
      frequency: (import.meta.env.NEWSLETTER_FREQUENCY as any) || 'daily',
      weeklyDay: import.meta.env.NEWSLETTER_WEEKLY_DAY || 'monday',
      monthlyDate: parseInt(import.meta.env.NEWSLETTER_MONTHLY_DATE || '1')
    };

    this.batchConfig = {
      maxRecipientsPerBatch: parseInt(import.meta.env.NEWSLETTER_MAX_RECIPIENTS_PER_BATCH || '100'),
      batchDelay: parseInt(import.meta.env.NEWSLETTER_BATCH_DELAY || '1000'),
      retryAttempts: parseInt(import.meta.env.NEWSLETTER_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(import.meta.env.NEWSLETTER_RETRY_DELAY || '5000')
    };

    this.contentConfig = {
      minArticles: parseInt(import.meta.env.NEWSLETTER_MIN_ARTICLES || '1'),
      maxArticles: parseInt(import.meta.env.NEWSLETTER_MAX_ARTICLES || '10'),
      includeImages: import.meta.env.NEWSLETTER_INCLUDE_IMAGES !== 'false'
    };
  }

  /**
   * 检查是否应该发送邮件
   */
  shouldSendToday(): boolean {
    const now = new Date();
    const today = this.getDateInTimezone(now, this.scheduleConfig.timezone);
    
    switch (this.scheduleConfig.frequency) {
      case 'daily':
        return true;
        
      case 'weekly':
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayName = dayNames[today.getDay()];
        return todayName === this.scheduleConfig.weeklyDay?.toLowerCase();
        
      case 'monthly':
        return today.getDate() === this.scheduleConfig.monthlyDate;
        
      case 'disabled':
        return false;
        
      default:
        return false;
    }
  }

  /**
   * 检查当前时间是否为发送时间
   */
  isScheduledTime(): boolean {
    const now = new Date();
    const nowInTimezone = this.getDateInTimezone(now, this.scheduleConfig.timezone);
    const currentTime = nowInTimezone.toTimeString().substring(0, 5); // HH:MM
    
    return currentTime === this.scheduleConfig.sendTime;
  }

  /**
   * 获取指定时区的日期
   */
  private getDateInTimezone(date: Date, timezone: string): Date {
    return new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  }

  /**
   * 计算下一次发送时间
   */
  getNextScheduledTime(): Date {
    const now = new Date();
    const [hours, minutes] = this.scheduleConfig.sendTime.split(':').map(Number);
    
    let nextSend = new Date();
    nextSend.setHours(hours, minutes, 0, 0);
    
    // 如果今天的发送时间已过，计算下一次发送时间
    if (nextSend <= now || !this.shouldSendToday()) {
      switch (this.scheduleConfig.frequency) {
        case 'daily':
          nextSend.setDate(nextSend.getDate() + 1);
          break;
          
        case 'weekly':
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const targetDay = dayNames.indexOf(this.scheduleConfig.weeklyDay?.toLowerCase() || 'monday');
          const currentDay = nextSend.getDay();
          const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
          nextSend.setDate(nextSend.getDate() + daysUntilTarget);
          break;
          
        case 'monthly':
          nextSend.setMonth(nextSend.getMonth() + 1);
          nextSend.setDate(this.scheduleConfig.monthlyDate || 1);
          break;
      }
    }
    
    return nextSend;
  }

  /**
   * 分批发送邮件
   */
  async sendEmailsInBatches<T>(
    recipients: T[], 
    sendFunction: (recipient: T) => Promise<any>
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{recipient: T; success: boolean; error?: string}>;
  }> {
    const results: Array<{recipient: T; success: boolean; error?: string}> = [];
    let successCount = 0;
    let failureCount = 0;

    // 分批处理
    const batches = this.chunkArray(recipients, this.batchConfig.maxRecipientsPerBatch);
    
    console.log(`📧 Sending emails in ${batches.length} batches of up to ${this.batchConfig.maxRecipientsPerBatch} recipients each`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`📦 Processing batch ${i + 1}/${batches.length} (${batch.length} recipients)`);

      // 批次内并发发送
      const batchPromises = batch.map(async (recipient) => {
        let attempts = 0;
        let lastError: any = null;

        while (attempts < this.batchConfig.retryAttempts) {
          try {
            await sendFunction(recipient);
            successCount++;
            return { recipient, success: true };
          } catch (error) {
            attempts++;
            lastError = error;
            
            if (attempts < this.batchConfig.retryAttempts) {
              console.log(`⚠️ Attempt ${attempts} failed for recipient, retrying in ${this.batchConfig.retryDelay}ms...`);
              await this.delay(this.batchConfig.retryDelay);
            }
          }
        }

        failureCount++;
        console.error(`❌ Failed to send email after ${attempts} attempts:`, lastError);
        return { 
          recipient, 
          success: false, 
          error: lastError?.message || 'Unknown error' 
        };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 批次间延迟
      if (i < batches.length - 1) {
        await this.delay(this.batchConfig.batchDelay);
      }
    }

    return { successCount, failureCount, results };
  }

  /**
   * 数组分块工具
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 延迟工具
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取配置信息
   */
  getConfig() {
    return {
      schedule: this.scheduleConfig,
      batch: this.batchConfig,
      content: this.contentConfig,
      nextScheduledTime: this.getNextScheduledTime(),
      shouldSendToday: this.shouldSendToday(),
      isScheduledTime: this.isScheduledTime()
    };
  }

  /**
   * 验证配置是否有效
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证时间格式
    if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(this.scheduleConfig.sendTime)) {
      errors.push('Invalid NEWSLETTER_SEND_TIME format. Use HH:MM format.');
    }

    // 验证频率
    const validFrequencies = ['daily', 'weekly', 'monthly', 'disabled'];
    if (!validFrequencies.includes(this.scheduleConfig.frequency)) {
      errors.push('Invalid NEWSLETTER_FREQUENCY. Use: daily, weekly, monthly, or disabled.');
    }

    // 验证月份日期
    if (this.scheduleConfig.frequency === 'monthly') {
      const date = this.scheduleConfig.monthlyDate;
      if (!date || date < 1 || date > 28) {
        errors.push('NEWSLETTER_MONTHLY_DATE must be between 1 and 28.');
      }
    }

    // 验证批次配置
    if (this.batchConfig.maxRecipientsPerBatch < 1 || this.batchConfig.maxRecipientsPerBatch > 1000) {
      errors.push('NEWSLETTER_MAX_RECIPIENTS_PER_BATCH must be between 1 and 1000.');
    }

    return { valid: errors.length === 0, errors };
  }
}

// 导出单例实例
export const emailScheduler = new EmailScheduler();
