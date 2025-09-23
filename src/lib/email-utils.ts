// 邮件工具函数
export interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image: string;
  author: string;
  publishDate: Date;
  category: string;
}

export interface Subscriber {
  id: number;
  email: string;
  unsubscribeToken: string;
  user?: {
    username?: string;
    displayName?: string;
  };
}

export function generateDailyNewsletterHTML(articles: Article[], subscriber: Subscriber): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const userName = subscriber.user?.displayName || subscriber.user?.username || 'Reader';
  const unsubscribeUrl = `https://imacxnews.com/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IMACX News Daily Update</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f5f5;">
  
  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 20px 0;">
        
        <!-- Main Content -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                📰 IMACX News
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px; font-weight: 500;">
                Daily Update for ${currentDate}
              </p>
            </td>
          </tr>
          
          <!-- Welcome Message -->
          <tr>
            <td style="padding: 30px 30px 20px 30px;">
              <p style="margin: 0; font-size: 16px; color: #333333;">
                Hi ${userName},
              </p>
              <p style="margin: 10px 0 0 0; font-size: 14px; color: #666666;">
                Here ${articles.length === 1 ? 'is' : 'are'} ${articles.length === 1 ? 'the latest article' : `${articles.length} new articles`} published today on IMACX News:
              </p>
            </td>
          </tr>
          
          <!-- Articles Content -->
          <tr>
            <td style="padding: 0 30px;">
              
              ${articles.map((article, index) => `
                <!-- Article ${index + 1} -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px; border: 1px solid #e8eaed; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                  ${article.image ? `
                    <!-- Article Image -->
                    <tr>
                      <td style="padding: 0;">
                        <img src="${article.image}" alt="${article.title}" style="width: 100%; height: 200px; object-fit: cover; display: block; border: none;">
                      </td>
                    </tr>
                  ` : ''}
                  
                  <!-- Article Content -->
                  <tr>
                    <td style="padding: 25px;">
                      
                      <!-- Category Badge -->
                      <div style="margin-bottom: 15px;">
                        <span style="background-color: #e3f2fd; color: #1565c0; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                          ${article.category}
                        </span>
                      </div>
                      
                      <!-- Article Title -->
                      <h2 style="margin: 0 0 15px 0; color: #1a73e8; font-size: 20px; font-weight: 700; line-height: 1.3;">
                        <a href="https://imacxnews.com/article/${article.slug}" style="color: #1a73e8; text-decoration: none; display: block;">
                          ${article.title}
                        </a>
                      </h2>
                      
                      <!-- Article Excerpt -->
                      <p style="color: #5f6368; margin: 0 0 20px 0; line-height: 1.6; font-size: 15px;">
                        ${article.excerpt}
                      </p>
                      
                      <!-- Read More Button -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="background-color: #1a73e8; border-radius: 6px;">
                            <a href="https://imacxnews.com/article/${article.slug}" style="background-color: #1a73e8; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; text-transform: uppercase; letter-spacing: 0.5px;">
                              Read Full Article →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Article Meta -->
                      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #f1f3f4; font-size: 13px; color: #9aa0a6;">
                        <span style="margin-right: 15px;">📅 ${new Date(article.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>✍️ ${article.author}</span>
                      </div>
                      
                    </td>
                  </tr>
                </table>
              `).join('')}
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e8eaed;">
              
              <!-- Social Links -->
              <div style="margin-bottom: 20px;">
                <a href="https://imacxnews.com" style="color: #1a73e8; text-decoration: none; margin: 0 15px; font-weight: 500;">
                  🏠 Visit Website
                </a>
                <a href="mailto:newsletter@imacxnews.com" style="color: #1a73e8; text-decoration: none; margin: 0 15px; font-weight: 500;">
                  📧 Contact Us
                </a>
              </div>
              
              <!-- Subscription Info -->
              <p style="color: #5f6368; margin: 0 0 15px 0; font-size: 14px; line-height: 1.5;">
                📬 You received this email because you subscribed to IMACX News newsletter.<br>
                This email was sent to <strong>${subscriber.email}</strong>
              </p>
              
              <!-- Unsubscribe Link -->
              <p style="margin: 15px 0 0 0;">
                <a href="${unsubscribeUrl}" style="color: #ea4335; text-decoration: none; font-size: 13px; font-weight: 500;">
                  🚫 Unsubscribe from newsletter
                </a>
              </p>
              
              <!-- Copyright -->
              <p style="color: #9aa0a6; margin: 25px 0 0 0; font-size: 12px;">
                © ${new Date().getFullYear()} IMACX News. All rights reserved.
              </p>
              
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>`;
}

export function generateEmailSubject(articles: Article[]): string {
  const count = articles.length;
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  
  if (count === 1) {
    return `📰 IMACX News (${today}): ${articles[0].title}`;
  } else {
    return `📰 IMACX News Daily Update (${today}): ${count} New Articles`;
  }
}

export function generatePlainTextVersion(articles: Article[], subscriber: Subscriber): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const userName = subscriber.user?.displayName || subscriber.user?.username || 'Reader';
  const unsubscribeUrl = `https://imacxnews.com/api/newsletter/unsubscribe?token=${subscriber.unsubscribeToken}`;

  let content = `
IMACX News - Daily Update for ${currentDate}
${'='.repeat(50)}

Hi ${userName},

Here ${articles.length === 1 ? 'is the latest article' : `are ${articles.length} new articles`} published today on IMACX News:

`;

  articles.forEach((article, index) => {
    content += `
${index + 1}. ${article.title}
${'─'.repeat(30)}
Category: ${article.category}
Author: ${article.author}
Published: ${new Date(article.publishDate).toLocaleDateString()}

${article.excerpt}

Read full article: https://imacxnews.com/article/${article.slug}

`;
  });

  content += `
${'='.repeat(50)}

Visit IMACX News: https://imacxnews.com
Contact us: newsletter@imacxnews.com

You received this email because you subscribed to IMACX News newsletter.
This email was sent to: ${subscriber.email}

To unsubscribe, click here: ${unsubscribeUrl}

© ${new Date().getFullYear()} IMACX News. All rights reserved.
`;

  return content;
}
