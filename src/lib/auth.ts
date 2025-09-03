import jwt from 'jsonwebtoken';

export function setAuthCookie(headers: Headers, token: string) {
  // Local preview: do NOT set Secure to allow cookies over http://127.0.0.1
  headers.append('Set-Cookie', `token=${token}; Path=/; HttpOnly; SameSite=Lax`);
}

export function getUserFromRequest(request: Request): { id: number; role: 'USER' | 'ADMIN'; username: string } | null {
  // 1) 优先支持 Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const rawToken = bearer || (request.headers.get('cookie') || '').match(/(?:^|;\s*)token=([^;]+)/)?.[1];
  if (!rawToken) return null;
  try {
    return jwt.verify(decodeURIComponent(rawToken), import.meta.env.JWT_SECRET) as { id: number; role: 'USER' | 'ADMIN'; username: string };
  } catch {
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


