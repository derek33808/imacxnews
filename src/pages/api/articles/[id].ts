export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';
import { createDatabaseConnection, withRetry } from '../../../lib/database';

export const GET: APIRoute = async ({ params }) => {
  try {
    const prisma = createDatabaseConnection();
    const id = Number(params.id);
    
    const a = await withRetry(async () => {
      return await prisma.article.findUnique({ where: { id } });
    }, `Find article by ID: ${id}`);
    
    return a ? new Response(JSON.stringify(a), { headers: { 'Content-Type': 'application/json' } }) : new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const id = Number(params.id);
    const data = await request.json();

    const updates: any = { ...data };
    if (data.title) {
      updates.slug = String(data.title)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
    if (data.publishDate) {
      const d = new Date(data.publishDate);
      if (Number.isNaN(d.getTime())) return new Response(JSON.stringify({ error: 'Invalid publishDate' }), { status: 422, headers: { 'Content-Type': 'application/json' } });
      updates.publishDate = d;
    }

    const upd = await prisma.article.update({ where: { id }, data: updates });
    return new Response(JSON.stringify(upd), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const id = Number(params.id);
    await prisma.article.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', detail: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};


