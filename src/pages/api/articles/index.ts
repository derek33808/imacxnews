import type { APIRoute } from 'astro';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest, requireRole } from '../../../lib/auth';

const prisma = new PrismaClient();

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (slug) {
    const one = await prisma.article.findUnique({ where: { slug } });
    return new Response(JSON.stringify(one ? [one] : []));
  }
  const articles = await prisma.article.findMany({ orderBy: { publishDate: 'desc' } });
  return new Response(JSON.stringify(articles));
};

export const POST: APIRoute = async ({ request }) => {
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response('Forbidden', { status: 403 });
  }
  const data = await request.json();

  const slug = String(data.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  let publishDate: Date | undefined;
  if (data.publishDate) {
    const d = new Date(data.publishDate);
    if (Number.isNaN(d.getTime())) return new Response('Invalid publishDate', { status: 422 });
    publishDate = d;
  }

  const created = await prisma.article.create({
    data: {
      title: data.title,
      slug,
      excerpt: data.excerpt,
      content: data.content,
      chineseContent: data.chineseContent ?? null,
      category: data.category,
      image: data.image,
      author: data.author,
      publishDate: publishDate ?? new Date(),
      featured: Boolean(data.featured)
    }
  });
  return new Response(JSON.stringify(created), { status: 201 });
};


