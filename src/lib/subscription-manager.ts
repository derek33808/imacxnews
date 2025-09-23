// 全局订阅状态管理器
// 负责同步更新所有订阅点（首页、Footer、Header、用户资料模态框）

export interface SubscriptionData {
  subscribed: boolean;
  email?: string;
  subscription?: {
    id: string;
    source: string;
    subscribedAt: string;
    updatedAt?: string;
  };
}

class SubscriptionManager {
  private subscribers: Array<(data: SubscriptionData) => void> = [];
  private currentStatus: SubscriptionData = { subscribed: false };
  
  // 订阅状态变化通知
  onStatusChange(callback: (data: SubscriptionData) => void) {
    this.subscribers.push(callback);
    // 立即调用一次，传递当前状态
    callback(this.currentStatus);
    
    // 返回取消订阅函数
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }
  
  // 更新订阅状态并通知所有订阅者
  updateStatus(data: SubscriptionData) {
    this.currentStatus = data;
    console.log('📧 Subscription status updated:', data);
    
    // 通知所有订阅者
    this.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in subscription callback:', error);
      }
    });
  }
  
  // 获取当前状态
  getCurrentStatus(): SubscriptionData {
    return this.currentStatus;
  }
  
  // 从API检查订阅状态
  async checkStatus(): Promise<SubscriptionData> {
    try {
      // 先检查用户是否登录
      const authResponse = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      
      if (!authResponse.ok) {
        const data = { subscribed: false };
        this.updateStatus(data);
        return data;
      }
      
      const authResult = await authResponse.json();
      if (!authResult.success || !authResult.user) {
        const data = { subscribed: false };
        this.updateStatus(data);
        return data;
      }
      
      // 检查订阅状态
      const subscriptionResponse = await fetch('/api/newsletter/subscribe', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (subscriptionResponse.ok) {
        const subscriptionResult = await subscriptionResponse.json();
        const data: SubscriptionData = {
          subscribed: subscriptionResult.subscribed,
          email: subscriptionResult.email || authResult.user.email,
          subscription: subscriptionResult.subscription
        };
        this.updateStatus(data);
        return data;
      } else {
        const data: SubscriptionData = {
          subscribed: false,
          email: authResult.user.email
        };
        this.updateStatus(data);
        return data;
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      const data = { subscribed: false };
      this.updateStatus(data);
      return data;
    }
  }
  
  // 执行订阅操作
  async subscribe(source: string = 'unknown'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 重新检查状态以更新所有组件
        await this.checkStatus();
      }
      
      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      console.error('Subscription failed:', error);
      return {
        success: false,
        message: 'Failed to subscribe. Please try again later.'
      };
    }
  }
  
  // 执行取消订阅操作
  async unsubscribe(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 重新检查状态以更新所有组件
        await this.checkStatus();
      }
      
      return {
        success: result.success,
        message: result.message
      };
    } catch (error) {
      console.error('Unsubscription failed:', error);
      return {
        success: false,
        message: 'Failed to unsubscribe. Please try again later.'
      };
    }
  }
}

// 创建全局实例
export const subscriptionManager = new SubscriptionManager();

// 将管理器添加到全局对象，供其他脚本使用
declare global {
  interface Window {
    subscriptionManager: SubscriptionManager;
  }
}

if (typeof window !== 'undefined') {
  window.subscriptionManager = subscriptionManager;
}
