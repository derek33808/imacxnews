-- 修复文章ID 104的poster数据
-- 基于其YouTube视频URL生成缩略图

-- 查看当前文章数据
SELECT id, title, videoUrl, videoPoster FROM Article WHERE id = 104;

-- 为文章ID 104设置poster
-- 从YouTube URL: https://www.youtube.com/embed/swcumlkHEf4
-- 生成缩略图URL: https://img.youtube.com/vi/swcumlkHEf4/maxresdefault.jpg
UPDATE Article 
SET videoPoster = 'https://img.youtube.com/vi/swcumlkHEf4/maxresdefault.jpg'
WHERE id = 104;

-- 验证更新结果
SELECT id, title, videoUrl, videoPoster FROM Article WHERE id = 104;
