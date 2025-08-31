import jwt from 'jsonwebtoken';

export function setAuthCookie(headers: Headers, token: string) {
  const secureAttr = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.PROD) ? '; Secure' : '';
  headers.append('Set-Cookie', `token=${token}; Path=/; HttpOnly; SameSite=Lax${secureAttr}`);
}

export function getUserFromRequest(request: Request): { id: number; role: 'USER' | 'ADMIN'; username: string } | null {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
  if (!match) return null;
  try {
    return jwt.verify(decodeURIComponent(match[1]), import.meta.env.JWT_SECRET) as { id: number; role: 'USER' | 'ADMIN'; username: string };
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


