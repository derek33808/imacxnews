export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const user = getUserFromRequest(request);
  const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';
  
  const response = {
    authenticated: !!user,
    user: user ? {
      id: user.id,
      username: user.username,
      role: user.role
    } : null,
    timestamp: new Date().toISOString(),
    debug: isDev ? {
      hasAuthHeader: !!request.headers.get('authorization'),
      hasCookie: !!request.headers.get('cookie')?.includes('token='),
      cookieValue: request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1] ? 'present' : 'missing',
      jwtSecretConfigured: !!import.meta.env.JWT_SECRET
    } : undefined
  };
  
  const status = user ? 200 : 401;
  
  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};
