export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { setAuthCookie } from '../../../lib/auth';
import { getRequiredServerEnv, getServerEnv } from '../../../lib/env';

// 从环境变量获取管理员账户信息
const ADMIN_USERNAME = getServerEnv('ADMIN_USERNAME', { fallback: 'admin' }) || 'admin';
const ADMIN_PASSWORD = getServerEnv('ADMIN_PASSWORD');

export const POST: APIRoute = async ({ request }) => {
  try {
    // 检查环境变量是否配置
    if (!ADMIN_PASSWORD) {
      console.error('ADMIN_PASSWORD environment variable not set');
      return new Response('Server configuration error', { status: 500 });
    }

    const body = await request.json();
    const rawUsername = (body?.username ?? '').toString();
    const rawPassword = (body?.password ?? '').toString();
    const username = rawUsername.trim();
    const password = rawPassword.trim();

    // 宽松匹配：用户名不区分大小写；去除两端空格
    if (username.toLowerCase() !== ADMIN_USERNAME.toLowerCase() || password !== ADMIN_PASSWORD) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = jwt.sign(
      { id: 1, role: 'ADMIN', username },
      getRequiredServerEnv('JWT_SECRET'),
      { expiresIn: '7d' }
    );

    const headers = new Headers();
    // Use shared helper so local http preview works (no Secure flag in dev)
    setAuthCookie(headers, token);

    return new Response(JSON.stringify({ id: 1, username, role: 'ADMIN' }), {
      status: 200,
      headers
    });
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }
};


