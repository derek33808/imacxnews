// 获取Supabase上传URL和签名 - 用于客户端直接上传
export const prerender = false;

import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { supabaseAdmin, STORAGE_BUCKET } from '../../../lib/simpleCloudStorage';

export const POST: APIRoute = async ({ request }) => {
  // Authentication - Only allow admin upload
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch (error) {
    console.log('❌ Permission validation failed:', error);
    return new Response(JSON.stringify({ 
      error: 'Insufficient permissions, only administrators can upload media files' 
    }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    console.log('📤 Generating upload URL for client-side upload...');
    
    // Parse request
    const body = await request.json();
    const { fileName, fileType, fileSize, category = 'TodayNews' } = body;
    
    console.log(`📋 Upload request - File: ${fileName}, Type: ${fileType}, Size: ${fileSize} bytes`);
    
    // Validate file type
    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return new Response(JSON.stringify({ 
        error: 'Only images and videos are supported' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Generate storage path
    const timestamp = Date.now();
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const sanitizedBase = fileName
      .replace(/\.[^/.]+$/, '') // Remove extension
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9]+/g, '-') // ASCII-only slug
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const safeBase = sanitizedBase || `upload-${timestamp}`;
    
    const finalFileName = `${safeBase}-${timestamp}.${ext}`;
    const folder = isVideo ? 'videos' : 'images';
    const categoryPath = category === 'TodayNews' ? 'today-news' : 'past-news';
    const storagePath = `${folder}/${categoryPath}/${finalFileName}`;

    console.log(`📁 Storage path: ${storagePath}`);

    // Create a signed upload URL (for direct client upload)
    const { data: signedUrl, error: urlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (urlError) {
      console.error('❌ Failed to create signed URL:', urlError);
      throw urlError;
    }

    // Get the future public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    console.log(`✅ Upload URL generated successfully`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        uploadUrl: signedUrl.signedUrl,
        token: signedUrl.token,
        path: storagePath,
        publicUrl: publicUrl,
        finalFileName: finalFileName,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE'
      }
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('💥 Failed to generate upload URL:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to generate upload URL',
      detail: error.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
