import { Resend } from 'resend';

// 初始化 Resend 客户端
const resend = new Resend(import.meta.env.RESEND_API_KEY);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * 发送邮件的核心函数
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // 检查 API 密钥是否配置
    if (!import.meta.env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY === 'your-resend-api-key-here') {
      console.warn('⚠️ Resend API key not configured, using development mode');
      
      // 开发模式：模拟成功发送
      if (import.meta.env.NODE_ENV === 'development') {
        console.log('📧 [DEV MODE] Email would be sent to:', options.to);
        console.log('📧 [DEV MODE] Subject:', options.subject);
        console.log('📧 [DEV MODE] Content preview:', options.html.substring(0, 100) + '...');
        
        return { 
          success: true, 
          data: { id: 'dev-' + Date.now(), message: 'Email simulated in development mode' }
        };
      }
      
      return { 
        success: false, 
        error: 'Email service not configured. Please set RESEND_API_KEY environment variable.' 
      };
    }

    // 检查发送邮箱是否配置
    const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'service@imacxnews.com';
    const fromName = import.meta.env.RESEND_FROM_NAME || 'IMACX News';
    
    if (!fromEmail || fromEmail === 'your-email@example.com') {
      console.error('❌ RESEND_FROM_EMAIL not configured properly');
      return { 
        success: false, 
        error: 'Sender email not configured. Please set RESEND_FROM_EMAIL environment variable.' 
      };
    }

    console.log(`📧 Sending email to: ${options.to}`);
    console.log(`📧 Subject: ${options.subject}`);
    console.log(`📧 From: ${fromName} <${fromEmail}>`);

    // 发送邮件
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('❌ Email send error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send email' 
      };
    }

    console.log('✅ Email sent successfully:', data?.id);
    return { 
      success: true, 
      data: { 
        id: data?.id,
        to: options.to,
        subject: options.subject
      } 
    };

  } catch (error: any) {
    console.error('❌ Email service error:', error);
    return { 
      success: false, 
      error: error.message || 'Unknown email service error' 
    };
  }
}

/**
 * 发送多封邮件（批量发送）
 */
export async function sendBatchEmails(emails: EmailOptions[]): Promise<EmailResult[]> {
  console.log(`📧 Sending batch of ${emails.length} emails...`);
  
  const results = await Promise.all(
    emails.map(async (email) => {
      // 添加小延迟避免过于频繁的请求
      await new Promise(resolve => setTimeout(resolve, 100));
      return sendEmail(email);
    })
  );

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`📊 Batch email results: ${successCount} success, ${failureCount} failed`);
  
  return results;
}

/**
 * 验证邮箱格式
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * 邮件模板系统
 */
export const emailTemplates = {
  /**
   * Welcome Email Template
   */
  welcome: (username: string, displayName?: string) => ({
    subject: 'Welcome to IMACX News - Tech News Community',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        
        <!-- Header -->
        <div style="background: #1a73e8; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <span style="color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.02em;">IMACX News</span>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Tech News • In-depth Analysis • Future Insights</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #202124; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">Welcome to Our Community</h2>
            <p style="color: #5f6368; margin: 0; font-size: 16px;">
              Hello <strong style="color: #1a73e8;">${displayName || username}</strong>, thank you for signing up for IMACX News!
            </p>
          </div>
          
          <div style="background: #f1f5f9; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #475569; line-height: 1.7; margin: 0 0 20px 0;">
              We're excited to have you join our tech news community. Here's what you can enjoy:
            </p>
            
            <div style="margin: 20px 0;">
              <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; top: 0; color: #1a73e8; font-weight: 600;">•</span>
                <span style="color: #5f6368; line-height: 1.5;">Latest tech news and in-depth analysis</span>
              </div>
              <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; top: 0; color: #1a73e8; font-weight: 600;">•</span>
                <span style="color: #5f6368; line-height: 1.5;">Save articles you're interested in</span>
              </div>
              <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; top: 0; color: #1a73e8; font-weight: 600;">•</span>
                <span style="color: #5f6368; line-height: 1.5;">Participate in comments and community discussions</span>
              </div>
              <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; top: 0; color: #1a73e8; font-weight: 600;">•</span>
                <span style="color: #5f6368; line-height: 1.5;">Personalized reading experience</span>
              </div>
              <div style="margin-bottom: 12px; padding-left: 20px; position: relative;">
                <span style="position: absolute; left: 0; top: 0; color: #1a73e8; font-weight: 600;">•</span>
                <span style="color: #5f6368; line-height: 1.5;">Professional tech insights and future trends</span>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://imacxnews.com" 
               style="background: #1a73e8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(26, 115, 232, 0.2);">
              Start Exploring Tech World
            </a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 14px; line-height: 1.6;">
              If you have any questions or suggestions, feel free to reply to this email or contact our support team.<br>
              We hope you enjoy your time at IMACX News!
            </p>
            <p style="color: #1a73e8; margin: 20px 0 0 0; font-weight: 600;">
              IMACX News Team
            </p>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} IMACX News. All rights reserved.</p>
        </div>
        
      </div>
    `,
    text: `Welcome to IMACX News

Hello ${displayName || username},

Thank you for signing up for IMACX News! We're excited to have you join our tech news community.

Here's what you can enjoy:
• Latest tech news and in-depth analysis
• Save articles you're interested in
• Participate in comments and community discussions
• Personalized reading experience
• Professional tech insights and future trends

Start exploring now: https://imacxnews.com

If you have any questions, feel free to contact us!

IMACX News Team`
  }),

  /**
   * Password Reset Request Email Template
   */
  passwordResetRequest: (username: string, resetUrl: string, displayName?: string) => ({
    subject: 'IMACX News - Password Reset Request',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.02em; margin: 0;">IMACX News</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #202124; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
            <p style="color: #5f6368; margin: 0; font-size: 16px;">
              Hello <strong style="color: #dc2626;">${displayName || username}</strong>
            </p>
          </div>
          
          <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #991b1b; margin: 0 0 15px 0; font-weight: 600;">
              We received a request to reset your IMACX News account password.
            </p>
            <p style="color: #991b1b; margin: 0; line-height: 1.6;">
              Click the button below to reset your password. For your account security, this link will expire in 1 hour.
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3);">
              Reset My Password
            </a>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
              <strong>Can't click the button?</strong> Copy the following link to your browser address bar:
            </p>
            <p style="color: #dc2626; margin: 0; font-size: 14px; word-break: break-all;">
              ${resetUrl}
            </p>
          </div>
          
          <!-- Security Alert -->
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
            <p style="color: #92400e; margin: 0 0 10px 0; font-weight: 600;">Security Notice</p>
            <p style="color: #92400e; margin: 0; line-height: 1.6; font-size: 14px;">
              If you did not request a password reset, please ignore this email. Your password will not be changed.<br>
              If you are concerned about your account security, please contact our support team immediately:
              <a href="mailto:service@imacxnews.com" style="color: #92400e; font-weight: 600; text-decoration: underline;">service@imacxnews.com</a>
            </p>
          </div>
          
          <!-- Security Tips -->
          <div style="margin: 30px 0;">
            <h3 style="color: #202124; margin: 0 0 15px 0; font-size: 18px;">Security Recommendations</h3>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Use strong passwords with uppercase, lowercase, numbers, and special characters</li>
                <li>Never share your account information with others</li>
                <li>Update your password regularly (recommended every 3-6 months)</li>
                <li>Don't save login credentials on public devices</li>
                <li>Contact us immediately if you notice any suspicious activity</li>
              </ul>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              This reset link will expire in 1 hour. If you have any questions, please contact our support team.<br>
              We are committed to protecting your account security.
            </p>
            <p style="color: #dc2626; margin: 20px 0 0 0; font-weight: 600;">
              IMACX News Security Team
            </p>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} IMACX News. All rights reserved.</p>
        </div>
        
      </div>
    `,
    text: `IMACX News - Password Reset Request

Hello ${displayName || username},

We received a request to reset your IMACX News account password.

Click the following link to reset your password:
${resetUrl}

Security Notice:
- This link will expire in 1 hour
- If you did not request a password reset, please ignore this email
- If you are concerned about account security, contact us: service@imacxnews.com

Security Recommendations:
- Use strong passwords with uppercase, lowercase, numbers, and special characters
- Never share your account information with others
- Update your password regularly (recommended every 3-6 months)
- Don't save login credentials on public devices
- Contact us immediately if you notice any suspicious activity

If you have any questions, please contact our support team.

IMACX News Security Team`
  }),

  /**
   * Password Reset Confirmation Email Template
   */
  passwordReset: (username: string, displayName?: string) => ({
    subject: 'IMACX News - Password Reset Confirmation',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        
        <!-- Header -->
        <div style="background: #1a73e8; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <span style="color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.02em;">IMACX News</span>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Password Reset Confirmation</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #202124; margin: 0 0 15px 0; font-size: 24px; font-weight: 600;">Password Reset Successful</h2>
            <p style="color: #5f6368; margin: 0; font-size: 16px;">
              Hello <strong style="color: #1a73e8;">${displayName || username}</strong>
            </p>
          </div>
          
          <div style="background: #f1f5f9; border: 1px solid #dadce0; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #202124; margin: 0 0 15px 0; font-weight: 600;">
              Your IMACX News account password has been successfully reset.
            </p>
            <p style="color: #5f6368; margin: 0; line-height: 1.6;">
              You can now log in with your new password and continue enjoying our tech news service.
            </p>
          </div>
          
          <!-- Security Alert -->
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 0 8px 8px 0; margin: 25px 0;">
            <p style="color: #92400e; margin: 0 0 10px 0; font-weight: 600;">Security Alert</p>
            <p style="color: #92400e; margin: 0; line-height: 1.6; font-size: 14px;">
              If this password reset was not performed by you, please contact our support team immediately:
              <a href="mailto:support@imacxnews.com" style="color: #92400e; font-weight: 600; text-decoration: underline;">support@imacxnews.com</a>
            </p>
          </div>
          
          <!-- Security Tips -->
          <div style="margin: 30px 0;">
            <h3 style="color: #202124; margin: 0 0 15px 0; font-size: 18px;">Security Recommendations</h3>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Use strong passwords with uppercase, lowercase, numbers, and special characters</li>
                <li>Never share your account information with others</li>
                <li>Change your password regularly (recommended every 3-6 months)</li>
                <li>Avoid saving login status on public devices</li>
                <li>Contact us immediately if you notice any suspicious activity</li>
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://imacxnews.com/login" 
               style="background: #1a73e8; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(26, 115, 232, 0.2);">
              Login to Your Account
            </a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              If you have any questions or need assistance, please feel free to contact our support team.<br>
              We are committed to protecting your account security.
            </p>
            <p style="color: #1a73e8; margin: 20px 0 0 0; font-weight: 600;">
              IMACX News Security Team
            </p>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} IMACX News. All rights reserved.</p>
        </div>
        
      </div>
    `,
    text: `IMACX News - Password Reset Confirmation

Hello ${displayName || username},

Your IMACX News account password has been successfully reset!

You can now log in with your new password: https://imacxnews.com/login

Security Alert:
If this password reset was not performed by you, please contact us immediately: support@imacxnews.com

Security Recommendations:
• Use strong passwords with uppercase, lowercase, numbers, and special characters
• Never share your account information with others
• Change your password regularly (recommended every 3-6 months)
• Avoid saving login status on public devices
• Contact us immediately if you notice any suspicious activity

If you have any questions, feel free to contact our support team.

IMACX News Security Team`
  }),

  /**
   * Newsletter Subscription Confirmation Email Template
   */
  newsletterSubscription: (username: string, displayName?: string, unsubscribeUrl?: string) => ({
    subject: 'IMACX News Newsletter Subscription Confirmed',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        
        <!-- Header -->
        <div style="background: #1a73e8; padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <span style="color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.02em;">IMACX News</span>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Newsletter Subscription Confirmed</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <div style="text-align: center; margin-bottom: 30px;">
            
            <h2 style="color: #4338ca; margin: 0 0 15px 0; font-size: 24px;">Subscription Confirmed</h2>
            <p style="color: #374151; margin: 0; font-size: 16px;">
              Hello <strong style="color: #6366f1;">${displayName || username}</strong>
            </p>
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #3b82f6; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #1e40af; margin: 0 0 15px 0; font-weight: 600;">
              You're now subscribed to IMACX News Newsletter.
            </p>
            <p style="color: #1e40af; margin: 0; line-height: 1.6;">
              You'll receive our curated tech news and insights directly in your inbox. Stay ahead with the latest technology trends!
            </p>
          </div>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #4338ca; margin: 0 0 15px 0; font-size: 18px;">What to expect</h3>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Weekly curated tech news and analysis</li>
                <li>Exclusive insights from industry experts</li>
                <li>Breaking news alerts for major tech developments</li>
                <li>Product reviews and recommendations</li>
                <li>Future technology trends and predictions</li>
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://imacxnews.com" 
               style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
              Visit IMACX News
            </a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              Thank you for subscribing! We're excited to share amazing tech content with you.<br>
              You can manage your subscription preferences anytime.
            </p>
            ${unsubscribeUrl ? `<p style="margin: 15px 0 0 0; font-size: 12px;"><a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: none;">Unsubscribe</a></p>` : ''}
            <p style="color: #6366f1; margin: 20px 0 0 0; font-weight: 600;">
              IMACX News Team
            </p>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} IMACX News. All rights reserved.</p>
        </div>
        
      </div>
    `,
    text: `IMACX News Newsletter Subscription Confirmed

Hello ${displayName || username},

Thank you for subscribing to IMACX News Newsletter! You're now part of our tech community.

What to expect:
• Weekly curated tech news and analysis
• Exclusive insights from industry experts  
• Breaking news alerts for major tech developments
• Product reviews and recommendations
• Future technology trends and predictions

We're excited to share amazing tech content with you.

Visit us: https://imacxnews.com
${unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : ''}

IMACX News Team`
  }),

  /**
   * Newsletter Unsubscription Confirmation Email Template
   */
  newsletterUnsubscription: (username: string, displayName?: string) => ({
    subject: 'IMACX News Newsletter - Unsubscription Confirmed',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <span style="color:#ffffff; font-size:24px; font-weight:700;">IMACX News</span>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Newsletter Unsubscription Confirmed</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <div style="text-align: center; margin-bottom: 30px;">
            
            <h2 style="color: #475569; margin: 0 0 15px 0; font-size: 24px;">Unsubscribed Successfully</h2>
            <p style="color: #374151; margin: 0; font-size: 16px;">
              Hello <strong style="color: #64748b;">${displayName || username}</strong>
            </p>
          </div>
          
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #475569; margin: 0 0 15px 0; font-weight: 600;">You've been unsubscribed from IMACX News Newsletter.</p>
            <p style="color: #475569; margin: 0; line-height: 1.6;">
              We're sorry to see you go! Your email has been removed from our newsletter list and you won't receive any more emails from us.
            </p>
          </div>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #475569; margin: 0 0 15px 0; font-size: 18px;">We'd love your feedback</h3>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px;">
              <p style="color: #374151; margin: 0 0 15px 0; line-height: 1.6;">
                Help us improve by letting us know why you unsubscribed:
              </p>
              <ul style="color: #374151; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Too many emails</li>
                <li>Content not relevant</li>
                <li>Changed email preferences</li>
                <li>No longer interested in tech news</li>
                <li>Other reasons</li>
              </ul>
              <p style="color: #374151; margin: 15px 0 0 0; font-size: 14px;">
                Feel free to reply to this email with your feedback!
              </p>
            </div>
          </div>
          
          <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #065f46; margin: 0 0 10px 0; font-weight: 600;">Changed your mind?</p>
            <p style="color: #065f46; margin: 0; line-height: 1.6; font-size: 14px;">
              You can always resubscribe by visiting our website and signing up again. We'd be happy to have you back!
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="https://imacxnews.com" 
               style="background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(148, 163, 184, 0.3);">Visit IMACX News</a>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              Thank you for being part of our community.<br>
              We hope to see you again in the future!
            </p>
            <p style="color: #64748b; margin: 20px 0 0 0; font-weight: 600;">
              IMACX News Team
            </p>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} IMACX News. All rights reserved.</p>
        </div>
        
      </div>
    `,
    text: `IMACX News Newsletter - Unsubscription Confirmed

Hello ${displayName || username},

You've been successfully unsubscribed from IMACX News Newsletter.

We're sorry to see you go! Your email has been removed from our newsletter list and you won't receive any more emails from us.

We'd love your feedback on why you unsubscribed:
• Too many emails
• Content not relevant
• Changed email preferences  
• No longer interested in tech news
• Other reasons

Feel free to reply to this email with your feedback!

Changed your mind?
You can always resubscribe by visiting our website and signing up again. We'd be happy to have you back!

Visit us: https://imacxnews.com

Thank you for being part of our community. We hope to see you again in the future!

IMACX News Team`
  }),

  /**
   * Email Verification Email Template
   */
  emailVerification: (username: string, verificationUrl: string, displayName?: string) => ({
    subject: 'IMACX News - 请验证你的邮箱地址',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <span style="color:#ffffff; font-size:24px; font-weight:700;">IMACX News</span>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">邮箱地址验证</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #ffffff; padding: 40px 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <div style="text-align: center; margin-bottom: 30px;">
            
            <h2 style="color: #581c87; margin: 0 0 15px 0; font-size: 24px;">验证你的邮箱地址</h2>
            <p style="color: #374151; margin: 0; font-size: 16px;">
              你好 <strong style="color: #7c3aed;">${displayName || username}</strong>
            </p>
          </div>
          
          <div style="background: #faf5ff; border: 1px solid #a855f7; padding: 25px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #581c87; margin: 0 0 15px 0; line-height: 1.6;">
              为了确保你的账户安全并完成注册流程，请点击下方按钮验证你的邮箱地址：
            </p>
          </div>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verificationUrl}" 
               style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(168, 85, 247, 0.3);">验证邮箱地址</a>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
              <strong>无法点击按钮？</strong> 复制以下链接到浏览器地址栏：
            </p>
            <p style="color: #7c3aed; margin: 0; font-size: 14px; word-break: break-all;">
              ${verificationUrl}
            </p>
          </div>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <div style="display: flex; align-items: flex-start;">
              <div>
                <p style="color: #92400e; margin: 0 0 10px 0; font-weight: 600;">重要提醒</p>
                <p style="color: #92400e; margin: 0; line-height: 1.6; font-size: 14px;">此验证链接将在24小时后过期。如果链接已过期，你可以在登录页面重新请求验证邮件。</p>
              </div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
            <p style="color: #6b7280; margin: 0; font-size: 14px; line-height: 1.6;">
              如果你没有注册 IMACX News 账户，请忽略此邮件。<br>
              如有任何疑问，请联系我们的支持团队。
            </p>
            <p style="color: #7c3aed; margin: 20px 0 0 0; font-weight: 600;">
              IMACX News 团队
            </p>
          </div>
          
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© ${new Date().getFullYear()} IMACX News. All rights reserved.</p>
        </div>
        
      </div>
    `,
    text: `IMACX News - 邮箱地址验证

你好 ${displayName || username}，

为了确保你的账户安全并完成注册流程，请验证你的邮箱地址。

点击以下链接进行验证：
${verificationUrl}

重要提醒：
此验证链接将在24小时后过期。如果链接已过期，你可以在登录页面重新请求验证邮件。

如果你没有注册 IMACX News 账户，请忽略此邮件。
如有任何疑问，请联系我们的支持团队。

IMACX News 团队`
  })
};

/**
 * 快速发送欢迎邮件
 */
export async function sendWelcomeEmail(
  email: string, 
  username: string, 
  displayName?: string
): Promise<EmailResult> {
  const template = emailTemplates.welcome(username, displayName);
  
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * 快速发送密码重置请求邮件 - 🆕 
 */
export async function sendPasswordResetRequest(
  email: string, 
  username: string, 
  resetUrl: string,
  displayName?: string
): Promise<EmailResult> {
  const template = emailTemplates.passwordResetRequest(username, resetUrl, displayName);
  
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * 快速发送密码重置确认邮件
 */
export async function sendPasswordResetConfirmation(
  email: string, 
  username: string, 
  displayName?: string
): Promise<EmailResult> {
  const template = emailTemplates.passwordReset(username, displayName);
  
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * 快速发送邮箱验证邮件
 */
export async function sendEmailVerification(
  email: string, 
  username: string, 
  verificationUrl: string,
  displayName?: string
): Promise<EmailResult> {
  const template = emailTemplates.emailVerification(username, verificationUrl, displayName);
  
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * 快速发送newsletter订阅确认邮件
 */
export async function sendNewsletterSubscriptionConfirmation(
  email: string, 
  username: string, 
  unsubscribeUrl: string,
  displayName?: string
): Promise<EmailResult> {
  const template = emailTemplates.newsletterSubscription(username, displayName, unsubscribeUrl);
  
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * 快速发送newsletter取消订阅确认邮件
 */
export async function sendNewsletterUnsubscriptionConfirmation(
  email: string, 
  username: string, 
  displayName?: string
): Promise<EmailResult> {
  const template = emailTemplates.newsletterUnsubscription(username, displayName);
  
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
}

/**
 * 检查邮件服务配置状态
 */
export function checkEmailServiceStatus() {
  const status = {
    apiKey: !!import.meta.env.RESEND_API_KEY,
    fromEmail: !!import.meta.env.RESEND_FROM_EMAIL,
    fromName: !!import.meta.env.RESEND_FROM_NAME,
  };
  
  const isConfigured = status.apiKey && status.fromEmail;
  
  return {
    isConfigured,
    details: status,
    message: isConfigured 
      ? '✅ Email service is properly configured' 
      : '❌ Email service configuration incomplete'
  };
}
