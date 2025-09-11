// Debug upload test API - 专门诊断上传问题
export const prerender = false;

import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { SimpleMediaUploader } from '../../../lib/simpleCloudStorage';

export const POST: APIRoute = async ({ request }) => {
  // Authentication
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: 'Authentication failed',
      debug: {
        hasUser: !!user,
        userRole: user?.role,
        userId: user?.id
      }
    }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const category = (formData.get('category') as string) || 'debug-test';
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      user: {
        id: user?.id,
        role: user?.role,
        username: user?.username
      },
      file: {
        name: file?.name,
        size: file?.size,
        type: file?.type,
        lastModified: file?.lastModified
      },
      environment: {
        NODE_ENV: import.meta.env.NODE_ENV,
        SUPABASE_URL: import.meta.env.SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: import.meta.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
      },
      request: {
        category,
        userAgent: request.headers.get('user-agent'),
        contentLength: request.headers.get('content-length'),
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer')
      }
    };
    
    console.log('🔍 Debug upload test started:', debugInfo);
    
    // Validate file
    if (!file || file.size === 0) {
      return new Response(JSON.stringify({ 
        error: 'No file provided',
        debug: debugInfo
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // File validation
    const validation = SimpleMediaUploader.validateFile(file);
    console.log('📋 File validation result:', validation);
    
    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: validation.error,
        debug: { ...debugInfo, validation }
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Attempt upload with detailed error catching
    let uploadResult;
    try {
      console.log('📤 Starting upload with SimpleMediaUploader...');
      uploadResult = await SimpleMediaUploader.uploadFile(file, category);
      console.log('✅ Upload successful:', uploadResult);
    } catch (uploadError: any) {
      console.error('❌ Upload failed with detailed error:', uploadError);
      
      // Return detailed error information
      return new Response(JSON.stringify({
        error: 'Upload failed',
        message: uploadError.message,
        debug: {
          ...debugInfo,
          validation,
          uploadError: {
            name: uploadError.name,
            message: uploadError.message,
            stack: uploadError.stack,
            cause: uploadError.cause
          }
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Success response with debug info
    return new Response(JSON.stringify({
      success: true,
      data: uploadResult,
      debug: {
        ...debugInfo,
        validation,
        uploadResult: {
          url: uploadResult.url,
          path: uploadResult.path,
          type: uploadResult.type,
          size: uploadResult.size
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 Debug upload test crashed:', error);
    
    return new Response(JSON.stringify({
      error: 'Server error',
      message: error.message,
      debug: {
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
