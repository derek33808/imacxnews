import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    console.log('🚪 Logout API called');
    
    // 清除认证cookie
    cookies.delete('token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    console.log('✅ Logout successful - cookie cleared');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      message: 'Logout failed'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
