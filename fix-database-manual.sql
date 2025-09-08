-- Manual Database Schema Update for Media Support
-- Execute this in Supabase SQL Editor

-- Add media support fields to Article table
ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS "mediaType" TEXT NOT NULL DEFAULT 'IMAGE';

ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS "videoPoster" TEXT;

ALTER TABLE "Article" 
ADD COLUMN IF NOT EXISTS "videoDuration" INTEGER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "Article_mediaType_idx" ON "Article"("mediaType");
CREATE INDEX IF NOT EXISTS "Article_mediaType_publishDate_idx" ON "Article"("mediaType", "publishDate");

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'Article' AND table_schema = 'public'
ORDER BY ordinal_position;
