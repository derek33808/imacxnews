// SimpleCloudStorage service - Supabase Storage integration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || 'https://ihkdquydhciabhrwffkb.supabase.co';
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export const STORAGE_BUCKET = 'imacx-media';

export class SimpleMediaUploader {
  /**
   * Validate uploaded files
   */
  static validateFile(file: File): { 
    isValid: boolean; 
    type: 'image' | 'video'; 
    error?: string 
  } {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      return { 
        isValid: false, 
        type: 'image', 
        error: 'Only images and videos are supported' 
      };
    }
    
    // Get file size limits aligned with Supabase (50MB)
    const maxImageSize = parseInt(import.meta.env.MAX_IMAGE_SIZE || '10485760'); // 10MB
    const maxVideoSize = parseInt(import.meta.env.MAX_VIDEO_SIZE || '52428800'); // 50MB default
    
    const maxSize = isImage ? maxImageSize : maxVideoSize;
    if (file.size > maxSize) {
      return { 
        isValid: false, 
        type: isImage ? 'image' : 'video',
        error: `File too large, maximum ${Math.round(maxSize / 1024 / 1024)}MB supported` 
      };
    }
    
    // Validate file extension
    const allowedImageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const allowedVideoExts = ['mp4', 'webm', 'ogg', 'mov'];
    
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = isImage ? allowedImageExts : allowedVideoExts;
    
    if (!allowedExts.includes(ext)) {
      return {
        isValid: false,
        type: isImage ? 'image' : 'video',
        error: `Unsupported file format, supported formats: ${allowedExts.join(', ')}`
      };
    }
    
    return { isValid: true, type: isImage ? 'image' : 'video' };
  }

  /**
   * Upload file to Supabase Storage
   */
  static async uploadFile(
    file: File, 
    category: string = 'misc'
  ): Promise<{ 
    url: string; 
    path: string; 
    type: 'image' | 'video';
    size: number;
    name: string;
  }> {
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'File validation failed');
    }

    // Generate filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const sanitizedName = file.name
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-') // Replace special characters
      .substring(0, 50); // Limit length
    
    const filename = `${sanitizedName}-${timestamp}.${ext}`;
    
    // Determine storage path
    const folder = validation.type === 'image' ? 'images' : 'videos';
    const categoryPath = category === 'TodayNews' ? 'today-news' : 'past-news';
    const storagePath = `${folder}/${categoryPath}/${filename}`;

    console.log(`📤 Starting file upload: ${file.name} (${validation.type}) to ${storagePath}`);

    // Upload to Supabase Storage with enhanced error handling
    console.log(`🔧 Using bucket: ${STORAGE_BUCKET}`);
    console.log(`🔧 Supabase URL: ${supabaseUrl}`);
    console.log(`🔧 Service key configured: ${supabaseServiceKey ? 'Yes' : 'No'}`);

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '31536000', // 1 year cache
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('❌ Upload failed:', {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
        error: error.error,
        details: error
      });
      
      // 提供更详细的错误信息
      let enhancedError = `Upload failed: ${error.message}`;
      
      if (error.message.includes('Internal Error')) {
        enhancedError += '\n💡 这通常表示：';
        enhancedError += '\n- 存储桶不存在或权限配置错误';
        enhancedError += '\n- 服务角色密钥 (SUPABASE_SERVICE_ROLE_KEY) 无效或权限不足';
        enhancedError += '\n- 存储桶策略 (RLS Policies) 阻止了上传操作';
        enhancedError += '\n- 网络连接问题或 Supabase 服务临时不可用';
      }
      
      throw new Error(enhancedError);
    }

    // Get public access URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    console.log(`✅ Upload successful! URL: ${publicUrl}`);

    return {
      url: publicUrl,
      path: storagePath,
      type: validation.type,
      size: file.size,
      name: file.name
    };
  }

  /**
   * Delete file
   */
  static async deleteFile(path: string): Promise<void> {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log(`🗑️ File deleted: ${path}`);
  }

  /**
   * Get file information
   */
  static async getFileInfo(path: string) {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list(path.split('/').slice(0, -1).join('/'), {
        limit: 1000
      });

    if (error) {
      throw new Error(`Failed to get file information: ${error.message}`);
    }

    const filename = path.split('/').pop();
    return data.find(file => file.name === filename);
  }

  /**
   * Generate video thumbnail (simple version, returns first frame)
   */
  static generateVideoThumbnail(videoFile: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = 1; // Jump to 1 second
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbnailFile = new File(
                [blob], 
                videoFile.name.replace(/\.[^/.]+$/, '.jpg'),
                { type: 'image/jpeg' }
              );
              resolve(thumbnailFile);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          }, 'image/jpeg', 0.8);
        }
      };

      video.onerror = () => reject(new Error('Video loading failed'));
      video.src = URL.createObjectURL(videoFile);
    });
  }
}

/**
 * Utility function: Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Utility function: Format video duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
