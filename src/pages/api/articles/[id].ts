import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, requireRole } from '../../../lib/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  const a = await prisma.article.findUnique({ where: { id } });
  return a ? new Response(JSON.stringify(a)) : new Response('Not Found', { status: 404 });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response('Forbidden', { status: 403 });
  }
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
    if (Number.isNaN(d.getTime())) return new Response('Invalid publishDate', { status: 422 });
    updates.publishDate = d;
  }

  const upd = await prisma.article.update({ where: { id }, data: updates });
  return new Response(JSON.stringify(upd));
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response('Forbidden', { status: 403 });
  }
  const id = Number(params.id);
  await prisma.article.delete({ where: { id } });
  return new Response(null, { status: 204 });
};


