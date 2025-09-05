# Supabase 媒体存储方案 - 支持图片和视频新闻

## 📋 方案概述

本方案基于Supabase Storage实现全球化的媒体文件存储和管理，支持管理员上传图片和视频新闻，解决本地存储无法跨地域访问的问题。

### 🎯 核心功能
- ✅ **图片新闻**: 支持JPG、PNG、WebP、GIF格式，自动生成多尺寸版本
- ✅ **视频新闻**: 支持MP4、WebM、MOV格式，大文件上传和流媒体播放  
- ✅ **全球CDN**: Supabase自动分发到全球节点
- ✅ **权限控制**: 仅管理员可上传，所有人可查看
- ✅ **进度显示**: 实时上传进度和状态反馈
- ✅ **媒体管理**: 完整的媒体库界面和操作

### 🌐 技术架构
```
管理员界面 → 文件上传 → Supabase Storage → 全球CDN → 用户访问
     ↓              ↓              ↓
  权限验证      文件处理        缓存优化
```

## 🔧 环境配置

### 1. 环境变量设置
在项目根目录的 `.env` 文件中添加：

```env
# Supabase 配置
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 存储桶配置
SUPABASE_STORAGE_BUCKET=imacx-media

# 可选：文件大小限制 (bytes)
MAX_IMAGE_SIZE=10485760   # 10MB
MAX_VIDEO_SIZE=524288000  # 500MB
```

### 2. Supabase Storage 设置

在Supabase Dashboard中执行以下SQL：

```sql
-- 创建存储桶（如果还没有创建）
INSERT INTO storage.buckets (id, name, public)
VALUES ('imacx-media', 'imacx-media', true);

-- 设置存储策略
-- 管理员可以上传文件
CREATE POLICY "Admin can upload files" ON storage.objects
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'ADMIN'
);

-- 管理员可以删除文件
CREATE POLICY "Admin can delete files" ON storage.objects
FOR DELETE USING (
  auth.jwt() ->> 'role' = 'ADMIN'
);

-- 所有人可以查看文件
CREATE POLICY "Anyone can view files" ON storage.objects
FOR SELECT USING (bucket_id = 'imacx-media');

-- 管理员可以更新文件
CREATE POLICY "Admin can update files" ON storage.objects
FOR UPDATE USING (
  auth.jwt() ->> 'role' = 'ADMIN'
);
```

## 📦 依赖安装

```bash
# 安装Supabase客户端
npm install @supabase/supabase-js

# 安装图片处理库（用于生成缩略图）
npm install sharp

# 安装文件处理工具（如果需要）
npm install multer
```

## 💻 代码实现

### 1. Supabase 存储服务 (`src/lib/cloudStorage.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL!;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY!;

// 管理端客户端 - 有完整权限
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// 公共客户端 - 用于前端
export const supabasePublic = createClient(
  supabaseUrl, 
  import.meta.env.SUPABASE_ANON_KEY!
);

export const STORAGE_BUCKET = 'imacx-media';

// 文件类型配置
export const MEDIA_CONFIG = {
  images: {
    types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxSize: parseInt(import.meta.env.MAX_IMAGE_SIZE) || 10 * 1024 * 1024, // 10MB
    folder: 'images'
  },
  videos: {
    types: ['video/mp4', 'video/webm', 'video/mov', 'video/quicktime'],
    maxSize: parseInt(import.meta.env.MAX_VIDEO_SIZE) || 500 * 1024 * 1024, // 500MB
    folder: 'videos'
  }
};

// 图片压缩尺寸配置
export const IMAGE_SIZES = {
  thumbnail: { width: 400, height: 300, quality: 75 },
  medium: { width: 800, height: 600, quality: 85 },
  large: { width: 1200, height: 900, quality: 90 }
};

export class CloudStorageService {
  
  /**
   * 验证上传的文件
   */
  static validateFile(file: File): { isValid: boolean; type?: 'image' | 'video'; error?: string } {
    const imageTypes = MEDIA_CONFIG.images.types;
    const videoTypes = MEDIA_CONFIG.videos.types;
    
    if (imageTypes.includes(file.type)) {
      if (file.size > MEDIA_CONFIG.images.maxSize) {
        return { 
          isValid: false, 
          error: `Image too large. Max: ${Math.round(MEDIA_CONFIG.images.maxSize / (1024 * 1024))}MB` 
        };
      }
      return { isValid: true, type: 'image' };
    }
    
    if (videoTypes.includes(file.type)) {
      if (file.size > MEDIA_CONFIG.videos.maxSize) {
        return { 
          isValid: false, 
          error: `Video too large. Max: ${Math.round(MEDIA_CONFIG.videos.maxSize / (1024 * 1024))}MB` 
        };
      }
      return { isValid: true, type: 'video' };
    }
    
    return { isValid: false, error: 'Unsupported file type' };
  }

  /**
   * 生成文件存储路径
   */
  static generateFilePath(type: 'image' | 'video', category: string, filename: string): string {
    const timestamp = Date.now();
    const categoryPath = category === 'TodayNews' ? 'today-news' : 
                        category === 'PastNews' ? 'past-news' : 'misc';
    
    return `${MEDIA_CONFIG[type + 's'].folder}/${categoryPath}/${timestamp}-${filename}`;
  }

  /**
   * 上传文件到Supabase Storage
   */
  static async uploadFile(
    file: File, 
    filePath: string, 
    onProgress?: (progress: number) => void
  ): Promise<{ url: string; path: string }> {
    
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '31536000', // 1年缓存
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // 获取公共URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return { url: publicUrl, path: filePath };
  }

  /**
   * 生成图片多尺寸版本
   */
  static async generateImageVariants(
    originalBuffer: ArrayBuffer, 
    basePath: string
  ): Promise<Record<string, string>> {
    const sharp = (await import('sharp')).default;
    const variants: Record<string, string> = {};
    
    for (const [size, config] of Object.entries(IMAGE_SIZES)) {
      try {
        const resizedBuffer = await sharp(originalBuffer)
          .resize(config.width, config.height, { 
            fit: 'inside', 
            withoutEnlargement: true 
          })
          .webp({ quality: config.quality })
          .toBuffer();

        const variantPath = basePath.replace(/\.[^.]+$/, `-${size}.webp`);
        
        const { data, error } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .upload(variantPath, resizedBuffer, {
            contentType: 'image/webp',
            cacheControl: '31536000'
          });

        if (!error) {
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(variantPath);
          
          variants[size] = publicUrl;
        }
      } catch (error) {
        console.warn(`Failed to generate ${size} variant:`, error);
      }
    }
    
    return variants;
  }

  /**
   * 删除文件及其变体
   */
  static async deleteFile(filePath: string): Promise<void> {
    // 删除主文件
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }

    // 删除缩略图（如果存在）
    const basePath = filePath.replace(/\.[^.]+$/, '');
    const thumbnailSizes = ['thumbnail', 'medium', 'large'];
    
    for (const size of thumbnailSizes) {
      const thumbPath = `${basePath}-${size}.webp`;
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([thumbPath]);
    }
  }

  /**
   * 获取文件列表
   */
  static async listFiles(folder?: string): Promise<any[]> {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list(folder || '', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      throw new Error(`List failed: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(filePath: string): Promise<any> {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list('', {
        search: filePath
      });

    if (error) {
      throw new Error(`Get file info failed: ${error.message}`);
    }

    return data?.[0] || null;
  }
}
```

### 2. 上传API (`src/pages/api/upload.ts`)

```typescript
export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../lib/auth';
import { CloudStorageService } from '../../lib/cloudStorage';

function sanitizeFilename(name: string): string {
  // Keep alphanumerics, dot, dash, underscore
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '-');
  // Avoid hidden files
  return base.replace(/^\.+/, '').slice(0, 200) || `upload-${Date.now()}`;
}

function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export const POST: APIRoute = async ({ request }) => {
  // 权限验证
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // 文件验证
    const validation = CloudStorageService.validateFile(file);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ error: validation.error }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const category = String(formData.get('category') || 'misc');
    const rawSlug = String(formData.get('slug') || '');
    const slug = slugify(rawSlug) || sanitizeFilename(file.name.split('.')[0]);
    const generateVariants = formData.get('generateVariants') !== 'false';

    // 生成文件名和路径
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const filename = sanitizeFilename(`${slug}.${ext}`);
    const filePath = CloudStorageService.generateFilePath(validation.type!, category, filename);

    // 上传原文件
    const uploadResult = await CloudStorageService.uploadFile(file, filePath);
    
    const result: any = {
      url: uploadResult.url,
      path: uploadResult.path,
      name: filename,
      type: validation.type,
      size: file.size,
      category,
      originalName: file.name,
      mimeType: file.type
    };

    // 为图片生成多尺寸版本
    if (validation.type === 'image' && generateVariants) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const variants = await CloudStorageService.generateImageVariants(arrayBuffer, filePath);
        result.variants = variants;
      } catch (error) {
        console.warn('Failed to generate image variants:', error);
      }
    }

    // 视频文件添加额外信息
    if (validation.type === 'video') {
      result.streaming = true;
      result.poster = null; // 可以后续实现视频缩略图
      result.duration = null; // 可以后续实现视频时长检测
    }

    return new Response(JSON.stringify(result), { 
      status: 201, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: 'Upload failed', 
      detail: error?.message || String(error) 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
```

### 3. 删除API (`src/pages/api/upload/delete.ts`)

```typescript
export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { CloudStorageService } from '../../../lib/cloudStorage';

export const DELETE: APIRoute = async ({ request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const { path } = await request.json();
    
    if (!path) {
      return new Response(JSON.stringify({ error: 'File path required' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    await CloudStorageService.deleteFile(path);

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('Delete error:', error);
    return new Response(JSON.stringify({ 
      error: 'Delete failed', 
      detail: error?.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
```

### 4. 媒体列表API (`src/pages/api/media/index.ts`)

```typescript
export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { CloudStorageService } from '../../../lib/cloudStorage';

export const GET: APIRoute = async ({ request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  try {
    const url = new URL(request.url);
    const folder = url.searchParams.get('folder') || '';
    const type = url.searchParams.get('type'); // 'images' or 'videos'
    
    const files = await CloudStorageService.listFiles(type || folder);
    
    // 过滤和格式化文件信息
    const formattedFiles = files.map(file => ({
      name: file.name,
      size: file.metadata?.size || 0,
      mimeType: file.metadata?.mimetype || '',
      lastModified: file.updated_at,
      url: `${import.meta.env.SUPABASE_URL}/storage/v1/object/public/imacx-media/${file.name}`,
      path: file.name
    }));

    return new Response(JSON.stringify(formattedFiles), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    console.error('List media error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to list media', 
      detail: error?.message 
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
```

### 5. 视频新闻上传组件 (`src/components/ui/VideoNewsUploader.astro`)

```astro
---
---

<div class="video-news-uploader">
  <div class="upload-tabs">
    <button class="tab-btn active" data-type="image">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21,15 16,10 5,21"/>
      </svg>
      图片新闻
    </button>
    <button class="tab-btn" data-type="video">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="23 7 16 12 23 17 23 7"/>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
      视频新闻
    </button>
  </div>

  <!-- 图片上传区域 -->
  <div class="upload-section active" id="imageUpload">
    <div class="upload-zone" data-type="image">
      <div class="upload-content">
        <div class="upload-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21,15 16,10 5,21"/>
          </svg>
        </div>
        <h3>上传图片新闻</h3>
        <p>支持 JPG, PNG, WebP, GIF 格式</p>
        <div class="upload-specs">
          <span>最大文件大小: 10MB</span>
          <span>推荐尺寸: 1200x800px</span>
          <span>自动生成缩略图</span>
        </div>
        <button type="button" class="upload-btn" onclick="document.getElementById('imageInput').click()">
          选择图片
        </button>
        <input type="file" id="imageInput" accept="image/*" multiple style="display: none;">
      </div>
    </div>
  </div>

  <!-- 视频上传区域 -->
  <div class="upload-section" id="videoUpload">
    <div class="upload-zone" data-type="video">
      <div class="upload-content">
        <div class="upload-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </div>
        <h3>上传视频新闻</h3>
        <p>支持 MP4, WebM, MOV 格式</p>
        <div class="upload-specs">
          <span>最大文件大小: 500MB</span>
          <span>推荐分辨率: 1920x1080</span>
          <span>推荐码率: 5-10 Mbps</span>
          <span>自动CDN分发</span>
        </div>
        <button type="button" class="upload-btn" onclick="document.getElementById('videoInput').click()">
          选择视频
        </button>
        <input type="file" id="videoInput" accept="video/*" style="display: none;">
      </div>
    </div>
  </div>

  <!-- 上传进度 -->
  <div class="progress-container" id="progressContainer" style="display: none;">
    <h4>上传进度</h4>
    <div class="progress-list" id="progressList"></div>
  </div>

  <!-- 媒体预览 -->
  <div class="media-preview-section" id="mediaPreview" style="display: none;">
    <h4>已上传媒体</h4>
    <div class="preview-container" id="previewContainer"></div>
  </div>

  <!-- 媒体库 -->
  <div class="media-library-section" id="mediaLibrary">
    <div class="library-header">
      <h4>媒体库</h4>
      <div class="library-controls">
        <select id="typeFilter" class="filter-select">
          <option value="">所有类型</option>
          <option value="images">图片</option>
          <option value="videos">视频</option>
        </select>
        <button type="button" class="refresh-btn" onclick="videoNewsUploader.refreshLibrary()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9c3 0 6 2 7 5"/>
            <path d="M21 6v6h-6"/>
          </svg>
          刷新
        </button>
      </div>
    </div>
    
    <div class="media-grid" id="mediaGrid">
      <!-- 媒体文件将在这里显示 -->
    </div>
  </div>
</div>

<style>
  .video-news-uploader {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
  }

  .upload-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
  }

  .tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    background: transparent;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.3s ease;
    position: relative;
  }

  .tab-btn::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 0;
    right: 0;
    height: 2px;
    background: #6366f1;
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }

  .tab-btn.active {
    color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }

  .tab-btn.active::after {
    transform: scaleX(1);
  }

  .upload-section {
    display: none;
  }

  .upload-section.active {
    display: block;
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .upload-zone {
    border: 2px dashed #cbd5e1;
    border-radius: 16px;
    padding: 3rem 2rem;
    text-align: center;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    position: relative;
    overflow: hidden;
  }

  .upload-zone:hover,
  .upload-zone.dragover {
    border-color: #6366f1;
    background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(99, 102, 241, 0.1);
  }

  .upload-zone[data-type="video"]:hover {
    border-color: #059669;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  }

  .upload-icon {
    color: #64748b;
    margin-bottom: 1.5rem;
    transition: all 0.3s ease;
  }

  .upload-zone:hover .upload-icon {
    transform: scale(1.1);
  }

  .upload-zone[data-type="image"]:hover .upload-icon {
    color: #6366f1;
  }

  .upload-zone[data-type="video"]:hover .upload-icon {
    color: #059669;
  }

  .upload-content h3 {
    margin: 0 0 0.75rem 0;
    color: #1e293b;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .upload-content p {
    margin: 0 0 1.5rem 0;
    color: #64748b;
    font-size: 1rem;
  }

  .upload-specs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 2rem;
    font-size: 0.875rem;
    color: #94a3b8;
  }

  .upload-btn {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    border: none;
    padding: 14px 32px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .upload-zone[data-type="video"] .upload-btn {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
    box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
  }

  .upload-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
  }

  .upload-zone[data-type="video"] .upload-btn:hover {
    box-shadow: 0 8px 25px rgba(5, 150, 105, 0.4);
  }

  /* 进度条、预览和媒体库样式 */
  .progress-container,
  .media-preview-section,
  .media-library-section {
    margin-top: 2rem;
    padding: 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .progress-container h4,
  .media-preview-section h4,
  .library-header h4 {
    margin: 0 0 1.5rem 0;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .progress-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: #f8fafc;
    border-radius: 12px;
    margin-bottom: 1rem;
    border: 1px solid #e2e8f0;
  }

  .file-preview {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .file-preview img,
  .file-preview video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .progress-bar {
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    flex: 1;
    margin: 0 1rem;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 4px;
    transition: width 0.3s ease;
    width: 0%;
  }

  .upload-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    min-width: 120px;
  }

  .status-uploading { color: #f59e0b; }
  .status-success { color: #10b981; }
  .status-error { color: #ef4444; }

  /* 媒体库 */
  .library-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .library-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .filter-select {
    padding: 8px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    font-size: 0.875rem;
    cursor: pointer;
    transition: border-color 0.3s ease;
  }

  .filter-select:focus {
    outline: none;
    border-color: #6366f1;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 8px 16px;
    background: #f8fafc;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .refresh-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #475569;
  }

  .media-grid,
  .preview-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .media-item,
  .preview-item {
    background: #f8fafc;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    transition: all 0.3s ease;
  }

  .media-item:hover,
  .preview-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }

  .media-preview,
  .preview-media {
    width: 100%;
    height: 150px;
    background: #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .media-preview img,
  .media-preview video,
  .preview-media img,
  .preview-media video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .media-info,
  .preview-info {
    padding: 1rem;
  }

  .media-name,
  .preview-name {
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .media-meta,
  .preview-meta {
    font-size: 0.75rem;
    color: #64748b;
    display: flex;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .media-actions,
  .preview-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    flex: 1;
    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .copy-url-btn {
    background: #f0f9ff;
    color: #0369a1;
    border: 1px solid #bae6fd;
  }

  .copy-url-btn:hover {
    background: #e0f2fe;
  }

  .insert-btn {
    background: #f0fdf4;
    color: #166534;
    border: 1px solid #bbf7d0;
  }

  .insert-btn:hover {
    background: #dcfce7;
  }

  .delete-btn {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .delete-btn:hover {
    background: #fee2e2;
  }

  /* 响应式设计 */
  @media (max-width: 768px) {
    .video-news-uploader {
      padding: 1rem;
    }

    .upload-zone {
      padding: 2rem 1rem;
    }

    .upload-specs {
      font-size: 0.8rem;
    }

    .media-grid,
    .preview-container {
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
    }

    .progress-item {
      flex-direction: column;
      text-align: center;
    }

    .progress-bar {
      width: 100%;
      margin: 1rem 0;
    }

    .library-header {
      flex-direction: column;
      align-items: stretch;
    }

    .library-controls {
      justify-content: center;
    }
  }

  /* 暗色主题支持 */
  @media (prefers-color-scheme: dark) {
    .upload-zone {
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border-color: #475569;
    }

    .upload-zone:hover {
      background: linear-gradient(135deg, #312e81 0%, #3730a3 100%);
      border-color: #6366f1;
    }

    .upload-zone[data-type="video"]:hover {
      background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
      border-color: #059669;
    }

    .upload-content h3,
    .progress-container h4,
    .media-preview-section h4,
    .library-header h4 {
      color: #f1f5f9;
    }

    .upload-content p,
    .upload-specs {
      color: #94a3b8;
    }

    .progress-container,
    .media-preview-section,
    .media-library-section {
      background: #1e293b;
      color: #f1f5f9;
    }

    .progress-item,
    .media-item,
    .preview-item {
      background: #334155;
      border-color: #475569;
    }

    .filter-select {
      background: #334155;
      border-color: #475569;
      color: #f1f5f9;
    }

    .refresh-btn {
      background: #334155;
      border-color: #475569;
      color: #94a3b8;
    }

    .refresh-btn:hover {
      background: #475569;
      border-color: #64748b;
      color: #f1f5f9;
    }
  }
</style>

<script>
  class VideoNewsUploader {
    constructor() {
      this.currentType = 'image';
      this.uploadQueue = [];
      this.isUploading = false;
      
      this.setupEventListeners();
      this.loadMediaLibrary();
    }

    setupEventListeners() {
      // 选项卡切换
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.switchTab(btn.dataset.type);
        });
      });

      // 文件输入
      document.getElementById('imageInput').addEventListener('change', (e) => {
        this.handleFiles(Array.from(e.target.files), 'image');
        e.target.value = ''; // 重置输入框
      });

      document.getElementById('videoInput').addEventListener('change', (e) => {
        this.handleFiles(Array.from(e.target.files), 'video');
        e.target.value = ''; // 重置输入框
      });

      // 拖拽上传
      this.setupDragAndDrop();

      // 筛选器
      document.getElementById('typeFilter').addEventListener('change', () => {
        this.loadMediaLibrary();
      });
    }

    switchTab(type) {
      this.currentType = type;
      
      // 更新选项卡状态
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
      });

      // 更新上传区域
      document.querySelectorAll('.upload-section').forEach(section => {
        section.classList.toggle('active', section.id === `${type}Upload`);
      });
    }

    setupDragAndDrop() {
      document.querySelectorAll('.upload-zone').forEach(zone => {
        zone.addEventListener('dragover', (e) => {
          e.preventDefault();
          zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
          zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
          e.preventDefault();
          zone.classList.remove('dragover');
          const files = Array.from(e.dataTransfer.files);
          const type = zone.dataset.type;
          this.handleFiles(files, type);
        });
      });
    }

    async handleFiles(files, type) {
      if (files.length === 0) return;

      // 验证文件类型
      const validFiles = files.filter(file => {
        if (type === 'image') {
          return file.type.startsWith('image/');
        } else if (type === 'video') {
          return file.type.startsWith('video/');
        }
        return false;
      });

      if (validFiles.length === 0) {
        alert(`请选择有效的${type === 'image' ? '图片' : '视频'}文件`);
        return;
      }

      this.uploadQueue.push(...validFiles.map(file => ({ file, type })));
      document.getElementById('progressContainer').style.display = 'block';
      
      if (!this.isUploading) {
        this.processUploadQueue();
      }
    }

    async processUploadQueue() {
      if (this.uploadQueue.length === 0) {
        this.isUploading = false;
        return;
      }

      this.isUploading = true;
      
      while (this.uploadQueue.length > 0) {
        const { file, type } = this.uploadQueue.shift();
        await this.uploadFile(file, type);
      }
      
      this.isUploading = false;
      
      // 隐藏进度区域
      setTimeout(() => {
        if (document.getElementById('progressList').children.length === 0) {
          document.getElementById('progressContainer').style.display = 'none';
        }
      }, 2000);
    }

    async uploadFile(file, type) {
      const uploadId = Date.now() + Math.random();
      const progressItem = this.createProgressItem(file, uploadId, type);
      document.getElementById('progressList').appendChild(progressItem);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'TodayNews'); // 可以根据需要调整
        formData.append('slug', file.name.split('.')[0]);
        formData.append('generateVariants', type === 'image' ? 'true' : 'false');

        const xhr = new XMLHttpRequest();
        
        // 上传进度
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            this.updateProgress(uploadId, percent);
          }
        });

        // 上传完成
        xhr.addEventListener('load', () => {
          if (xhr.status === 201) {
            const response = JSON.parse(xhr.responseText);
            this.onUploadSuccess(uploadId, response);
          } else {
            this.onUploadError(uploadId, 'Upload failed');
          }
        });

        xhr.addEventListener('error', () => {
          this.onUploadError(uploadId, 'Network error');
        });

        xhr.open('POST', '/api/upload');
        xhr.send(formData);

      } catch (error) {
        this.onUploadError(uploadId, error.message);
      }
    }

    createProgressItem(file, uploadId, type) {
      const item = document.createElement('div');
      item.className = 'progress-item';
      item.dataset.uploadId = uploadId;

      const preview = this.createFilePreview(file, type);
      
      item.innerHTML = `
        ${preview}
        <div style="flex: 1;">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">${file.name}</div>
          <div style="font-size: 0.875rem; color: #64748b;">
            ${this.formatFileSize(file.size)} • ${type.toUpperCase()}
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div class="upload-status status-uploading">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          上传中...
        </div>
      `;

      return item;
    }

    createFilePreview(file, type) {
      if (type === 'image') {
        const url = URL.createObjectURL(file);
        return `<div class="file-preview"><img src="${url}" alt="Preview" onload="URL.revokeObjectURL(this.src)"></div>`;
      } else if (type === 'video') {
        const url = URL.createObjectURL(file);
        return `<div class="file-preview"><video src="${url}" onloadeddata="URL.revokeObjectURL(this.src)" muted></video></div>`;
      }
    }

    updateProgress(uploadId, percent) {
      const item = document.querySelector(`[data-upload-id="${uploadId}"]`);
      if (item) {
        const progressFill = item.querySelector('.progress-fill');
        progressFill.style.width = `${percent}%`;
      }
    }

    onUploadSuccess(uploadId, response) {
      const item = document.querySelector(`[data-upload-id="${uploadId}"]`);
      if (item) {
        const status = item.querySelector('.upload-status');
        status.className = 'upload-status status-success';
        status.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          上传成功
        `;

        // 添加到预览区域
        setTimeout(() => {
          this.addToPreview(response);
          item.remove();
          
          // 刷新媒体库
          this.loadMediaLibrary();
        }, 1500);
      }
    }

    onUploadError(uploadId, error) {
      const item = document.querySelector(`[data-upload-id="${uploadId}"]`);
      if (item) {
        const status = item.querySelector('.upload-status');
        status.className = 'upload-status status-error';
        status.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          ${error}
        `;
      }
    }

    addToPreview(fileData) {
      document.getElementById('mediaPreview').style.display = 'block';
      
      const previewItem = document.createElement('div');
      previewItem.className = 'preview-item';
      
      const mediaElement = fileData.type === 'image' 
        ? `<img src="${fileData.variants?.thumbnail || fileData.url}" alt="${fileData.name}">`
        : `<video src="${fileData.url}" controls muted poster="${fileData.poster || ''}"></video>`;

      previewItem.innerHTML = `
        <div class="preview-media">${mediaElement}</div>
        <div class="preview-info">
          <div class="preview-name">${fileData.name}</div>
          <div class="preview-meta">
            <span>${fileData.type.toUpperCase()}</span>
            <span>${this.formatFileSize(fileData.size)}</span>
          </div>
          <div class="preview-actions">
            <button class="action-btn copy-url-btn" onclick="navigator.clipboard.writeText('${fileData.url}')">
              复制链接
            </button>
            <button class="action-btn insert-btn" onclick="videoNewsUploader.insertIntoEditor('${fileData.url}', '${fileData.type}')">
              插入编辑器
            </button>
          </div>
        </div>
      `;

      document.getElementById('previewContainer').appendChild(previewItem);
    }

    async loadMediaLibrary() {
      try {
        const typeFilter = document.getElementById('typeFilter').value;
        const response = await fetch(`/api/media?type=${typeFilter}`);
        
        if (response.ok) {
          const files = await response.json();
          this.renderMediaLibrary(files);
        }
      } catch (error) {
        console.error('Failed to load media library:', error);
      }
    }

    renderMediaLibrary(files) {
      const mediaGrid = document.getElementById('mediaGrid');
      mediaGrid.innerHTML = '';
      
      if (files.length === 0) {
        mediaGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #64748b;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom: 1rem; opacity: 0.5;">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
            <p>暂无媒体文件</p>
          </div>
        `;
        return;
      }

      files.forEach(file => {
        const mediaItem = this.createMediaItem(file);
        mediaGrid.appendChild(mediaItem);
      });
    }

    createMediaItem(file) {
      const item = document.createElement('div');
      item.className = 'media-item';
      
      const isImage = file.mimeType.startsWith('image/');
      const isVideo = file.mimeType.startsWith('video/');
      
      const preview = isImage 
        ? `<img src="${file.url}" alt="${file.name}">`
        : isVideo
        ? `<video src="${file.url}" muted></video>`
        : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
             <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
             <polyline points="14,2 14,8 20,8"/>
           </svg>`;

      item.innerHTML = `
        <div class="media-preview">${preview}</div>
        <div class="media-info">
          <div class="media-name">${file.name}</div>
          <div class="media-meta">
            <span>${isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE'}</span>
            <span>${this.formatFileSize(file.size)}</span>
          </div>
          <div class="media-actions">
            <button class="action-btn copy-url-btn" onclick="navigator.clipboard.writeText('${file.url}')">
              复制链接
            </button>
            <button class="action-btn insert-btn" onclick="videoNewsUploader.insertIntoEditor('${file.url}', '${isImage ? 'image' : 'video'}')">
              插入
            </button>
            <button class="action-btn delete-btn" onclick="videoNewsUploader.deleteMedia('${file.path}')">
              删除
            </button>
          </div>
        </div>
      `;

      return item;
    }

    insertIntoEditor(url, type) {
      // 这里可以集成到您的文章编辑器中
      console.log(`Insert ${type}: ${url}`);
      
      // 示例：如果有富文本编辑器
      if (type === 'image') {
        const imageHTML = `<img src="${url}" alt="Uploaded image" style="max-width: 100%; height: auto;">`;
        // 插入到编辑器...
      } else if (type === 'video') {
        const videoHTML = `<video src="${url}" controls style="max-width: 100%; height: auto;"></video>`;
        // 插入到编辑器...
      }
      
      // 暂时复制到剪贴板
      navigator.clipboard.writeText(url);
      alert(`${type === 'image' ? '图片' : '视频'} URL已复制到剪贴板，可以粘贴到编辑器中`);
    }

    async deleteMedia(filePath) {
      if (!confirm('确定要删除这个文件吗？')) return;

      try {
        const response = await fetch('/api/upload/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath })
        });

        if (response.ok) {
          this.loadMediaLibrary();
          alert('文件删除成功');
        } else {
          alert('删除失败');
        }
      } catch (error) {
        alert('删除失败: ' + error.message);
      }
    }

    refreshLibrary() {
      this.loadMediaLibrary();
    }

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
  }

  // 全局实例
  let videoNewsUploader;

  document.addEventListener('DOMContentLoaded', () => {
    videoNewsUploader = new VideoNewsUploader();
  });
</script>
```

### 6. 视频播放器组件 (`src/components/ui/VideoPlayer.astro`)

```astro
---
export interface Props {
  src: string;
  poster?: string;
  title?: string;
  autoplay?: boolean;
  controls?: boolean;
  width?: string;
  height?: string;
  muted?: boolean;
}

const { 
  src, 
  poster, 
  title = '',
  autoplay = false,
  controls = true,
  width = '100%',
  height = 'auto',
  muted = false
} = Astro.props;
---

<div class="video-player-container">
  <video 
    class="video-player"
    src={src}
    poster={poster}
    title={title}
    controls={controls}
    autoplay={autoplay}
    muted={muted}
    style={`width: ${width}; height: ${height};`}
    preload="metadata"
    playsinline
  >
    <p>您的浏览器不支持视频播放。请 <a href={src} download>下载视频</a>。</p>
  </video>
  
  {title && (
    <div class="video-caption">
      {title}
    </div>
  )}
</div>

<style>
  .video-player-container {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: #000;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-width: 100%;
  }

  .video-player {
    width: 100%;
    height: auto;
    display: block;
    border-radius: inherit;
  }

  .video-caption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    color: white;
    padding: 1rem;
    font-size: 0.9rem;
    font-weight: 500;
  }

  /* 视频加载状态 */
  .video-player:not([poster]) {
    background: linear-gradient(45deg, #f3f4f6, #e5e7eb);
    min-height: 200px;
    position: relative;
  }

  .video-player:not([poster])::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='1.5'%3E%3Cpolygon points='23 7 16 12 23 17 23 7'/%3E%3Crect x='1' y='5' width='15' height='14' rx='2' ry='2'/%3E%3C/svg%3E") center/64px no-repeat;
    opacity: 0.5;
    pointer-events: none;
  }

  .video-player[poster]::before {
    display: none;
  }

  /* 响应式视频 */
  @media (max-width: 768px) {
    .video-player-container {
      border-radius: 8px;
    }
    
    .video-caption {
      padding: 0.75rem;
      font-size: 0.8rem;
    }
  }

  /* 暗色主题 */
  @media (prefers-color-scheme: dark) {
    .video-player-container {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
  }
</style>
```

## 🚀 实施步骤

### 第一步：环境准备
1. **注册Supabase账户**
   - 访问 [supabase.com](https://supabase.com)
   - 创建新项目
   - 获取项目URL和API密钥

2. **配置环境变量**
   ```bash
   # 在项目根目录创建 .env 文件
   echo "SUPABASE_URL=your-project-url" >> .env
   echo "SUPABASE_ANON_KEY=your-anon-key" >> .env
   echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" >> .env
   echo "SUPABASE_STORAGE_BUCKET=imacx-media" >> .env
   ```

### 第二步：安装依赖
```bash
npm install @supabase/supabase-js sharp
```

### 第三步：设置存储策略
在Supabase Dashboard的SQL编辑器中执行存储策略SQL（见上文）。

### 第四步：实现代码
1. 创建 `src/lib/cloudStorage.ts`
2. 更新 `src/pages/api/upload.ts`
3. 创建其他API端点
4. 实现上传组件

### 第五步：集成到管理界面
将 `VideoNewsUploader` 组件集成到现有的管理员界面中。

### 第六步：测试和优化
1. 测试图片上传功能
2. 测试视频上传功能
3. 验证权限控制
4. 测试跨地域访问

## ⚡ 性能优化建议

### 1. 缓存策略
```javascript
// 在前端使用缓存
const cacheMedia = {
  get: (key) => {
    const cached = localStorage.getItem(`media_${key}`);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < 3600000) { // 1小时缓存
        return data;
      }
    }
    return null;
  },
  set: (key, data) => {
    localStorage.setItem(`media_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  }
};
```

### 2. 图片优化
- 自动生成WebP格式
- 多尺寸响应式图片
- 懒加载实现
- CDN缓存优化

### 3. 视频优化
- 自动压缩和转码
- 支持多格式播放
- 流媒体传输
- 预加载优化

## 🛡️ 安全考虑

### 1. 文件验证
```typescript
// 扩展文件验证
static validateFile(file: File) {
  // 文件类型检查
  const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type' };
  }
  
  // 文件大小检查
  const maxSize = file.type.startsWith('image/') ? 10 * 1024 * 1024 : 500 * 1024 * 1024;
  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large' };
  }
  
  // 文件名安全检查
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    return { isValid: false, error: 'Invalid filename' };
  }
  
  return { isValid: true };
}
```

### 2. 权限控制
- 仅管理员可上传
- 基于JWT的身份验证
- Row Level Security (RLS)
- API限流保护

### 3. 内容安全
- 文件扫描和检测
- 自动备份和恢复
- 访问日志记录
- 异常监控和报警

## 📊 监控和分析

### 1. 上传统计
```typescript
// 添加到上传API
const uploadStats = {
  totalUploads: 0,
  totalSize: 0,
  byType: { image: 0, video: 0 },
  byDate: {}
};

// 记录上传统计
uploadStats.totalUploads++;
uploadStats.totalSize += file.size;
uploadStats.byType[validation.type]++;
```

### 2. 性能监控
- 上传速度统计
- 失败率监控
- CDN命中率分析
- 用户体验指标

## 🔧 故障排除

### 常见问题和解决方案

1. **上传失败**
   - 检查网络连接
   - 验证文件大小和类型
   - 确认Supabase配置正确

2. **权限错误**
   - 确认用户角色设置
   - 检查RLS策略配置
   - 验证JWT令牌有效性

3. **CDN访问慢**
   - 启用Supabase CDN
   - 优化缓存策略
   - 考虑地理位置因素

## 📈 扩展功能

### 未来可实现的功能
1. **视频缩略图生成**
2. **自动内容审核**
3. **批量上传处理**
4. **媒体格式转换**
5. **AI驱动的标签生成**
6. **使用统计分析**

## 📝 总结

本方案提供了一个完整的基于Supabase的媒体存储解决方案，支持：

- ✅ **全球化访问**: 解决本地存储的地域限制
- ✅ **图片和视频**: 支持多媒体新闻发布
- ✅ **自动优化**: 图片压缩和多尺寸生成
- ✅ **用户体验**: 进度显示和预览功能
- ✅ **安全可靠**: 权限控制和数据保护
- ✅ **易于维护**: 清晰的代码结构和文档

通过遵循本文档的实施步骤，您可以快速部署一个功能完整、性能优异的媒体存储系统。
