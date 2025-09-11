// Media upload API - Support image and video upload to Supabase Storage
export const prerender = false;

import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { SimpleMediaUploader, supabaseAdmin, STORAGE_BUCKET } from '../../../lib/simpleCloudStorage';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

export const POST: APIRoute = async ({ request }) => {
  // 设置API路由超时处理
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), 25000); // 25秒超时
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
    console.log('📤 Processing media file upload request...');
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'misc';
    
    console.log(`📋 Upload parameters - File: ${file?.name}, Category: ${category}`);
    
    // Validate file existence
    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ 
        error: 'Please select a file to upload' 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Validate file
    const validation = SimpleMediaUploader.validateFile(file);
    if (!validation.isValid) {
      console.log('❌ File validation failed:', validation.error);
      return new Response(JSON.stringify({ 
        error: validation.error 
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    console.log(`✅ File validation passed - Type: ${validation.type}, Size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);

    // Upload file
    const uploadResult = await SimpleMediaUploader.uploadFile(file, category);
    
    console.log('🎉 Upload successful!', {
      url: uploadResult.url,
      type: uploadResult.type,
      size: uploadResult.size
    });

    // 🆕 保存媒体文件记录到数据库 (仅限已认证用户)
    if (user && user.id) {
      try {
        const db = createDatabaseConnection();
        await withRetry(() => 
          db.mediaFile.create({
            data: {
              filename: uploadResult.name,
              url: uploadResult.url,
              path: uploadResult.path,
              mediaType: uploadResult.type.toUpperCase(), // IMAGE | VIDEO
              mimeType: file.type,
              fileSize: file.size,
              title: null, // 初始为空，稍后可通过媒体库编辑
              category: category,
              uploadedBy: user.id // 使用已认证用户的ID
            }
          }), '保存媒体文件记录'
        );
        console.log('✅ 媒体文件记录已保存到数据库');
      } catch (dbError: any) {
        console.warn('⚠️ 保存媒体记录到数据库失败:', dbError.message);
        // 不影响上传成功响应，只是记录失败
        // 文件已经成功上传到Supabase，数据库记录可以后续补充
      }
    } else {
      console.log('ℹ️ 跳过数据库记录保存 (用户未认证或ID无效)');
    }

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      data: {
        url: uploadResult.url,
        path: uploadResult.path,
        type: uploadResult.type,
        mediaType: uploadResult.type.toUpperCase(), // Format for database field
        size: uploadResult.size,
        originalName: uploadResult.name,
        category: category,
        uploadedAt: new Date().toISOString()
      }
    }), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('💥 Media upload failed:', error);
    
    // Return different responses based on error type
    let errorMessage = 'Upload failed, please try again';
    let statusCode = 500;
    
    if (error.message.includes('File too large')) {
      errorMessage = 'File too large, please select a smaller file';
      statusCode = 413;
    } else if (error.message.includes('Invalid file type')) {
      errorMessage = 'Unsupported file format';
      statusCode = 415;
    } else if (error.message.includes('Quota exceeded')) {
      errorMessage = 'Storage space insufficient, please contact administrator';
      statusCode = 507;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), { 
      status: statusCode, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};

export const GET: APIRoute = async ({ request, url }) => {
  // Authentication
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  // Get query parameters
  const searchParams = url.searchParams;
  const action = searchParams.get('action') || 'info';

  try {
    switch (action) {
      case 'info':
        // Return upload information and limits
        return new Response(JSON.stringify({
          maxImageSize: parseInt(process.env.MAX_IMAGE_SIZE || '10485760'),
          maxVideoSize: parseInt(process.env.MAX_VIDEO_SIZE || '52428800'), 
          supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          supportedVideoFormats: ['mp4', 'webm', 'ogg', 'mov'],
          storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'imacx-media',
          videoEnabled: process.env.ENABLE_VIDEO_NEWS === 'true'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      case 'test':
        // Test Supabase Storage connection
        const { data, error } = await supabaseAdmin.storage.listBuckets();
        
        if (error) {
          throw error;
        }
        
        const bucket = data.find(b => b.name === STORAGE_BUCKET);
        
        return new Response(JSON.stringify({
          connected: true,
          bucket: bucket ? {
            name: bucket.name,
            public: bucket.public,
            created: bucket.created_at
          } : null,
          message: bucket ? 'Storage connection successful' : `Storage bucket ${STORAGE_BUCKET} does not exist`
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ 
          error: 'Unsupported operation' 
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
    }

  } catch (error: any) {
    console.error('API request failed:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      detail: error.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
