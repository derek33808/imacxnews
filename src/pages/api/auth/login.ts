import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';

// 简化版：使用固定 admin 账户，以便快速形成闭环
const ADMIN_USERNAME = 'Admin';
const ADMIN_PASSWORD = '1234';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return new Response('Unauthorized', { status: 401 });
    }

    const token = jwt.sign(
      { id: 1, role: 'ADMIN', username },
      import.meta.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const headers = new Headers();
    headers.append('Set-Cookie', `token=${token}; Path=/; HttpOnly; SameSite=Lax; Secure`);

    return new Response(JSON.stringify({ id: 1, username, role: 'ADMIN' }), {
      status: 200,
      headers
    });
  } catch (e) {
    return new Response('Bad Request', { status: 400 });
  }
};


