// 🆕 媒体库管理API - 提供完整的媒体文件管理功能
export const prerender = false;

import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

export const GET: APIRoute = async ({ request, url }) => {
  // 只允许管理员访问
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { 
      status: 403, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }

  const searchParams = url.searchParams;
  const action = searchParams.get('action') || 'list';
  
  try {
    const db = createDatabaseConnection();
    
    switch (action) {
      case 'list': {
        // 分页获取媒体文件列表
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const type = searchParams.get('type'); // IMAGE | VIDEO
        const category = searchParams.get('category');
        const search = searchParams.get('search');
        
        const skip = (page - 1) * limit;
        
        // 构建查询条件
        const where: any = {};
        if (type) where.mediaType = type;
        if (category) where.category = category;
        if (search) {
          where.OR = [
            { filename: { contains: search, mode: 'insensitive' } },
            { title: { contains: search, mode: 'insensitive' } }
          ];
        }
        
        console.log('📋 媒体库查询条件:', { where, page, limit });
        
        const [files, total] = await Promise.all([
          withRetry(() => db.mediaFile.findMany({
            where,
            orderBy: { uploadedAt: 'desc' },
            skip,
            take: limit,
            include: { 
              uploader: { 
                select: { username: true } 
              } 
            }
          }), '获取媒体文件列表'),
          
          withRetry(() => db.mediaFile.count({ where }), '统计媒体文件数量')
        ]);
        
        console.log(`✅ 找到 ${files.length} 个媒体文件，总计 ${total} 个`);
        
        return new Response(JSON.stringify({
          success: true,
          files,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      case 'stats': {
        // 获取媒体库统计信息
        console.log('📊 获取媒体库统计信息...');
        
        const stats = await withRetry(async () => {
          const [total, images, videos, totalSize, recentUploads] = await Promise.all([
            db.mediaFile.count(),
            db.mediaFile.count({ where: { mediaType: 'IMAGE' } }),
            db.mediaFile.count({ where: { mediaType: 'VIDEO' } }),
            db.mediaFile.aggregate({ _sum: { fileSize: true } }),
            db.mediaFile.count({ 
              where: { 
                uploadedAt: { 
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 最近30天
                } 
              } 
            })
          ]);
          
          return {
            totalFiles: total,
            imageCount: images,
            videoCount: videos,
            totalSizeBytes: totalSize._sum.fileSize || 0,
            totalSizeMB: Math.round((totalSize._sum.fileSize || 0) / 1024 / 1024 * 100) / 100,
            recentUploads: recentUploads
          };
        }, '获取媒体库统计');
        
        console.log('✅ 统计信息:', stats);
        
        return new Response(JSON.stringify({
          success: true,
          ...stats
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      case 'categories': {
        // 获取所有分类
        console.log('🏷️ 获取媒体分类列表...');
        
        const categories = await withRetry(() => 
          db.mediaFile.findMany({
            select: { category: true },
            distinct: ['category']
          }), '获取媒体分类'
        );
        
        const categoryList = categories.map(c => c.category).filter(Boolean);
        console.log('✅ 找到分类:', categoryList);
        
        return new Response(JSON.stringify({
          success: true,
          categories: categoryList
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      case 'detail': {
        // 获取单个媒体文件详情
        const id = searchParams.get('id');
        if (!id) {
          return new Response(JSON.stringify({ 
            error: 'Media file ID is required' 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        const file = await withRetry(() => 
          db.mediaFile.findUnique({
            where: { id: parseInt(id) },
            include: { 
              uploader: { 
                select: { username: true } 
              } 
            }
          }), '获取媒体文件详情'
        );
        
        if (!file) {
          return new Response(JSON.stringify({ 
            error: 'Media file not found' 
          }), { 
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({
          success: true,
          file
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      default:
        return new Response(JSON.stringify({ 
          error: 'Unsupported action' 
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
    }
  } catch (error: any) {
    console.error('❌ 媒体库API错误:', error);
    return new Response(JSON.stringify({ 
      error: 'Server error',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  // 更新媒体文件信息
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
    const { id, title, category } = await request.json();
    
    if (!id) {
      return new Response(JSON.stringify({ 
        error: 'Media file ID is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`📝 更新媒体文件 ${id}:`, { title, category });
    
    const db = createDatabaseConnection();
    
    const updated = await withRetry(() => 
      db.mediaFile.update({
        where: { id: parseInt(id) },
        data: { 
          title: title || undefined, 
          category: category || undefined,
          // 增加使用计数
          usageCount: { increment: 1 }
        },
        include: { 
          uploader: { 
            select: { username: true } 
          } 
        }
      }), '更新媒体文件'
    );
    
    console.log('✅ 媒体文件更新成功:', updated.filename);
    
    return new Response(JSON.stringify({
      success: true,
      file: updated
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('❌ 更新媒体文件失败:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  // 删除媒体文件
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
    const id = url.searchParams.get('id');
    if (!id) {
      return new Response(JSON.stringify({ 
        error: 'Media file ID is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`🗑️ 删除媒体文件 ${id}`);
    
    const db = createDatabaseConnection();
    
    // 获取文件信息用于日志
    const file = await withRetry(() => 
      db.mediaFile.findUnique({
        where: { id: parseInt(id) }
      }), '查找要删除的媒体文件'
    );
    
    if (!file) {
      return new Response(JSON.stringify({ 
        error: 'Media file not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 删除数据库记录（注意：这不会删除Supabase存储中的实际文件）
    await withRetry(() => 
      db.mediaFile.delete({
        where: { id: parseInt(id) }
      }), '删除媒体文件记录'
    );
    
    console.log(`✅ 媒体文件删除成功: ${file.filename}`);
    
    return new Response(JSON.stringify({ 
      success: true,
      message: `File ${file.filename} deleted successfully`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('❌ 删除媒体文件失败:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
