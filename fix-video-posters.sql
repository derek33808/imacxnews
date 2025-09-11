-- 修复现有视频文章的poster数据
-- 为所有有YouTube URL但没有poster的视频文章生成缩略图

-- 第一步：查看需要修复的文章
SELECT 
    id, 
    title, 
    mediaType, 
    videoUrl, 
    videoPoster, 
    image 
FROM Article 
WHERE mediaType = 'VIDEO' 
    AND videoUrl IS NOT NULL 
    AND videoUrl != '' 
    AND (videoPoster IS NULL OR videoPoster = '');

-- 第二步：为YouTube视频自动生成poster URL
-- 注意：这个更新会为所有YouTube视频生成maxresdefault.jpg缩略图
UPDATE Article 
SET videoPoster = CASE 
    -- YouTube embed URLs (https://www.youtube.com/embed/VIDEO_ID)
    WHEN videoUrl LIKE '%youtube.com/embed/%' THEN 
        'https://img.youtube.com/vi/' || 
        split_part(split_part(videoUrl, 'embed/', 2), '?', 1) || 
        '/maxresdefault.jpg'
    
    -- YouTube watch URLs (https://www.youtube.com/watch?v=VIDEO_ID)
    WHEN videoUrl LIKE '%youtube.com/watch?v=%' THEN 
        'https://img.youtube.com/vi/' || 
        split_part(split_part(videoUrl, 'v=', 2), '&', 1) || 
        '/maxresdefault.jpg'
    
    -- YouTube short URLs (https://youtu.be/VIDEO_ID)
    WHEN videoUrl LIKE '%youtu.be/%' THEN 
        'https://img.youtube.com/vi/' || 
        split_part(split_part(videoUrl, 'youtu.be/', 2), '?', 1) || 
        '/maxresdefault.jpg'
    
    -- 保持其他类型的视频不变
    ELSE videoPoster
END
WHERE mediaType = 'VIDEO' 
    AND videoUrl IS NOT NULL 
    AND videoUrl != '' 
    AND (videoPoster IS NULL OR videoPoster = '')
    AND (videoUrl LIKE '%youtube%' OR videoUrl LIKE '%youtu.be%');

-- 第三步：验证更新结果
SELECT 
    id, 
    title, 
    mediaType, 
    videoUrl, 
    videoPoster
FROM Article 
WHERE mediaType = 'VIDEO' 
    AND videoUrl IS NOT NULL 
    AND videoPoster IS NOT NULL
ORDER BY id DESC;
