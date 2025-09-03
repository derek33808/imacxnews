export const prerender = false;
import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { setAuthCookie } from '../../../lib/auth';

// 简化版：使用固定 admin 账户，以便快速形成闭环
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = '1234';

export const POST: APIRoute = async ({ request }) => {
  try {
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
      import.meta.env.JWT_SECRET,
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


