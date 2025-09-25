-- 添加缺失的前端文章到数据库
-- 请在Supabase SQL Editor中执行这些语句

-- 1. 添加 Reading Challenge Announcement
INSERT INTO "Article" (
  title, slug, excerpt, content, "chineseContent", 
  category, image, author, "publishDate", featured,
  "imageAlt", "contentLength", "readingTime"
) VALUES (
  'Reading Challenge Announcement for Grade 5',
  'reading-challenge-announcement',
  'Important information about the upcoming reading challenges for students advancing to Grade 5, including both Chinese and English reading requirements.',
  '<p>According to the briefing session of the fourth grade to the fifth grade last Friday, we learned that in terms of reading, Chinese needs to complete one million words of reading challenges and English needs to complete thirty reading challenges. These reading challenges require us to reasonably arrange our completion progress and track the reading progress throughout the year. This is far from the progress of a book in the fourth grade. The teacher also suggested that everyone should start training their typing and reading skills during the holiday. So please be mentally prepared.</p>',
  '<p>根据上周五的四年级升五年级的说明会我们了解到在阅读方面中文要完成一百万字的阅读挑战英文要完成三十本身的阅读挑战这些阅读挑战需要我们合理的安排我们的完成进度，并且在整个年度内跟踪阅读进展。这与我们现在四年级一本一本书的进展要拉开很大的距离。老师还建议大家在假期就开始训练自己的打字能力和阅读能力。所以还请大家做好心理准备。</p>',
  'TodayNews',
  'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Max and ISAAC and Corum',
  '2025-01-15T13:00:00Z',
  true,
  'Books and reading materials related to Reading Challenge Announcement for Grade 5',
  580,
  3
);

-- 2. 添加 Dali Trip Updates
INSERT INTO "Article" (
  title, slug, excerpt, content, "chineseContent", 
  category, image, author, "publishDate", featured,
  "imageAlt", "contentLength", "readingTime"
) VALUES (
  'Dali Trip Preparation Updates',
  'dali-trip-updates',
  'Important updates regarding the upcoming Dali trip, including packing requirements and accommodation details at Dali Xifuyuan Boutique B&B.',
  '<p>With the passage of time, the trip to Dali is also slowly coming. I believe everyone should be ready. This week, the teacher will also explain to us the last notes about Dali. Finally, let me remind you.</p><p>You can only bring a suitcase and a backpack for this trip. ELECTRONIC PRODUCTS CAN ONLY BE A WATCH AND A SCHOOL IPAD. You can''t go to the hotel. There are TVs in most rooms. The name of the hotel is Dali Xifuyuan Boutique B&B.</p>',
  '<p>随着时间的流逝大理之行也慢慢到来，相信大家应该也都做好了准备。就在这周老师也要向我们交代关于大理的最后注意事项。最后提醒一下大家这次旅行只能带一个要托运的行李行箱和一个背包。电子产品也只能带手表和学校IPAD。不能在酒店里串门。大部份房间有电视。酒店的名字是大理喜福苑精品民宿。</p>',
  'TodayNews',
  '/images/articles/today-news/dali-trip-updates.jpeg',
  'Max and ISAAC and Corum',
  '2025-01-14T12:00:00Z',
  true,
  'Photo illustration for Dali Trip Preparation Updates',
  420,
  2
);

-- 3. 添加 IMACX News Website Development
INSERT INTO "Article" (
  title, slug, excerpt, content, "chineseContent", 
  category, image, author, "publishDate", featured,
  "imageAlt", "contentLength", "readingTime"
) VALUES (
  'IMACX News Website Development with AI',
  'imacx-news-ai-website',
  'With the gradual development of artificial intelligence, IMACX News has created its website using AI technology, now entering the final stage of deployment.',
  '<p>With the slow development of artificial intelligence, we have also created our website with artificial intelligence. Now that our website has entered the last stage of lifting restrictions, it is expected that it will soon be displayed on our school''s IPAD. You can now search our IMACX NEWS website. To receive the latest news, you just need to refresh the web page every Sunday night, and the latest news will appear in front of you.</p>',
  '<p>随着人工智能的慢慢发展我们也用人工智能创造出了我们的网站。现在我们的网站已经进入了最后一个解除限制的阶段预计很快就可以呈现在我们的学校IPAD上了，你现在可以通过搜索进入我们的IMACX NEWS网站。要想收到最新的新闻，你只需在每周日晚上刷新网页，最新的新闻就会浮现在你眼前。</p>',
  'PastNews',
  'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Max and ISAAC and Corum',
  '2025-01-10T10:00:00Z',
  false,
  'Computer and technology illustration for IMACX News Website Development with AI',
  320,
  2
);

-- 验证结果
SELECT 
  COUNT(*) as total_articles,
  COUNT(CASE WHEN "imageAlt" IS NOT NULL THEN 1 END) as articles_with_alt,
  COUNT(CASE WHEN "contentLength" IS NOT NULL THEN 1 END) as articles_with_length,
  COUNT(CASE WHEN "readingTime" IS NOT NULL THEN 1 END) as articles_with_time
FROM "Article";

-- 显示所有文章
SELECT 
  id, title, slug, category, featured, "imageAlt", "contentLength", "readingTime"
FROM "Article" 
ORDER BY "publishDate" DESC;
