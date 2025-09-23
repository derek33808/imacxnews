export const prerender = false;
import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, requireRole } from '../../../lib/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // 验证认证 - 使用与用户管理API相同的方式
    const cookieHeader = request.headers.get('cookie') || '';
    const authCookie = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

    if (!authCookie) {
      console.log('❌ Newsletter API: No auth token found in cookies:', cookieHeader);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOGIN_REQUIRED',
        message: 'Please login to access this resource' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let userPayload;
    try {
      const jwt = (await import('jsonwebtoken')).default;
      const jwtSecret = import.meta.env.JWT_SECRET;
      
      if (!jwtSecret) {
        console.error('❌ Newsletter API: JWT_SECRET not configured');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'SERVER_CONFIG_ERROR',
          message: 'Server configuration error' 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      userPayload = jwt.verify(decodeURIComponent(authCookie), jwtSecret) as any;
      console.log('✅ Newsletter API: Token verified for user:', userPayload.username, 'role:', userPayload.role);
    } catch (error) {
      console.log('❌ Newsletter API: Token verification failed:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOGIN_REQUIRED',
        message: 'Invalid authentication token' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (userPayload.role !== 'ADMIN') {
      console.log('❌ Newsletter API: Access denied for role:', userPayload.role);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required' 
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔍 Admin newsletter subscriptions request from: ${userPayload.username}`);

    // 获取查询参数
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all'; // all, active, inactive
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    console.log('📊 Query parameters:', { page, limit, search, status, sortBy, sortOrder });

    const skip = (page - 1) * limit;

    // 构建查询条件
    const whereClause: any = {};
    
    // 状态筛选
    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }

    // 搜索条件
    if (search) {
      whereClause.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { user: { 
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { displayName: { contains: search, mode: 'insensitive' } }
          ]
        }}
      ];
    }

    // 排序条件
    const orderBy: any = {};
    if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else if (sortBy === 'username') {
      orderBy.user = { username: sortOrder };
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    }

    // 获取订阅列表
    console.log('🔍 Where clause:', JSON.stringify(whereClause, null, 2));
    console.log('🔍 Order by:', JSON.stringify(orderBy, null, 2));
    
    const [subscriptions, totalCount] = await Promise.all([
      prisma.newsSubscription.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              displayName: true,
              role: true,
              createdAt: true,
              avatar: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.newsSubscription.count({ where: whereClause })
    ]);
    
    console.log(`🔍 Found ${subscriptions.length} subscriptions out of ${totalCount} total`);

    // 获取统计信息
    const stats = await prisma.newsSubscription.aggregate({
      _count: {
        id: true
      },
      where: {
        isActive: true
      }
    });

    const inactiveCount = await prisma.newsSubscription.count({
      where: {
        isActive: false
      }
    });

    const totalUsers = await prisma.user.count();

    // 格式化响应数据
    const formattedSubscriptions = subscriptions.map(sub => ({
      id: sub.id,
      email: sub.email,
      isActive: sub.isActive,
      source: sub.source,
      subscribedAt: sub.createdAt, // 修复：使用 createdAt 而不是 subscribedAt
      updatedAt: sub.updatedAt,
      unsubscribeToken: sub.unsubscribeToken,
      user: {
        id: sub.user.id,
        username: sub.user.username,
        email: sub.user.email,
        displayName: sub.user.displayName,
        role: sub.user.role,
        createdAt: sub.user.createdAt,
        avatar: sub.user.avatar
      }
    }));

    const response = {
      success: true,
      data: {
        subscriptions: formattedSubscriptions,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        },
        stats: {
          totalSubscriptions: totalCount,
          activeSubscriptions: stats._count.id,
          inactiveSubscriptions: inactiveCount,
          totalUsers,
          subscriptionRate: totalUsers > 0 ? ((stats._count.id / totalUsers) * 100).toFixed(1) : '0'
        },
        filters: {
          search,
          status,
          sortBy,
          sortOrder
        }
      }
    };

    console.log(`✅ Admin newsletter subscriptions: Found ${totalCount} subscriptions`);

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Admin newsletter subscriptions error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch newsletter subscriptions'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
};

// 管理员操作：取消用户订阅
export const DELETE: APIRoute = async ({ request }) => {
  try {
    // 验证认证 - 使用与GET方法相同的方式
    const cookieHeader = request.headers.get('cookie') || '';
    const authCookie = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

    if (!authCookie) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOGIN_REQUIRED',
        message: 'Please login to access this resource' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let userPayload;
    try {
      const jwt = (await import('jsonwebtoken')).default;
      const jwtSecret = import.meta.env.JWT_SECRET;
      
      if (!jwtSecret) {
        console.error('❌ Newsletter API DELETE: JWT_SECRET not configured');
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'SERVER_CONFIG_ERROR',
          message: 'Server configuration error' 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      userPayload = jwt.verify(decodeURIComponent(authCookie), jwtSecret) as any;
    } catch (error) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'LOGIN_REQUIRED',
        message: 'Invalid authentication token' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (userPayload.role !== 'ADMIN') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required' 
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'MISSING_SUBSCRIPTION_ID',
        message: 'Subscription ID is required' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔧 Admin ${userPayload.username} canceling subscription: ${subscriptionId}`);

    // 查找并更新订阅
    const subscription = await prisma.newsSubscription.findUnique({
      where: { id: subscriptionId },
      include: { user: true }
    });

    if (!subscription) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Subscription not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!subscription.isActive) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'ALREADY_INACTIVE',
        message: 'Subscription is already inactive' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 取消订阅
    await prisma.newsSubscription.update({
      where: { id: subscriptionId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Admin canceled subscription for user: ${subscription.user.username} (${subscription.email})`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully canceled subscription for ${subscription.user.username}` 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Admin cancel subscription error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'INTERNAL_ERROR',
      message: 'Failed to cancel subscription'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    await prisma.$disconnect();
  }
};
