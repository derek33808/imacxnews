// @ts-ignore
import jwt from 'jsonwebtoken';
import { getRequiredServerEnv } from './env';

export function setAuthCookie(headers: Headers, token: string) {
  // Enhanced cookie settings for better compatibility
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const isSecure = !isDev && import.meta.env.PROD;
  
  // Build cookie string with enhanced options
  let cookieString = `token=${token}; Path=/; HttpOnly; SameSite=Lax`;
  
  // Add Secure flag only in production over HTTPS
  if (isSecure) {
    cookieString += '; Secure';
  }
  
  // Set longer expiration for better user experience
  const maxAge = 7 * 24 * 60 * 60; // 7 days for both dev and prod
  cookieString += `; Max-Age=${maxAge}`;
  
  headers.append('Set-Cookie', cookieString);
  
  // Debug logging in development
  if (isDev) {
    console.log('🍪 Setting auth cookie:', cookieString);
  }
}

export function getUserFromRequest(request: Request): { id: number; role: 'USER' | 'ADMIN'; username: string } | null {
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  // 1) 优先支持 Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const cookieHeader = request.headers.get('cookie') || '';
  const cookieToken = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)?.[1];
  const rawToken = bearer || cookieToken;
  
  if (isDev) {
    console.log('🔍 Auth Debug - Bearer:', !!bearer, 'Cookie:', !!cookieToken, 'Raw Token:', !!rawToken);
    if (cookieHeader) {
      console.log('🍪 Cookie Header:', cookieHeader);
    }
  }
  
  if (!rawToken) {
    if (isDev) console.log('❌ No token found in request');
    return null;
  }
  
  try {
    const jwtSecret = getRequiredServerEnv('JWT_SECRET');
    
    const decoded = jwt.verify(decodeURIComponent(rawToken), jwtSecret) as { id: number; role: 'USER' | 'ADMIN'; username: string };
    
    if (isDev) {
      console.log('✅ Token verified successfully for user:', decoded.username, 'role:', decoded.role);
    }
    
    return decoded;
  } catch (error) {
    if (isDev) {
      console.log('❌ Token verification failed:', error instanceof Error ? error.message : String(error));
    }
    return null;
  }
}

export function requireRole(user: any, roles: Array<'USER' | 'ADMIN'>) {
  if (!user || !roles.includes(user.role)) {
    const e = new Error('Forbidden');
    // @ts-ignore
    e.status = 403;
    throw e;
  }
}


