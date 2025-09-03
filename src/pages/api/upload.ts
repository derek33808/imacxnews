export const prerender = false;
import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../lib/auth';
import path from 'node:path';
import fs from 'node:fs/promises';

function sanitizeFilename(name: string): string {
  // Keep alphanumerics, dot, dash, underscore
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '-');
  // Avoid hidden files
  return base.replace(/^\.+/, '').slice(0, 200) || `upload-${Date.now()}`;
}

function slugify(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export const POST: APIRoute = async ({ request }) => {
  // Require admin
  const user = getUserFromRequest(request);
  try {
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const origName = (file as File).name || 'image';
    const category = String(formData.get('category') || 'uploads');
    const rawSlug = String(formData.get('slug') || '');
    const slug = slugify(rawSlug) || 'image';

    const ext = (origName.match(/\.[^.]+$/)?.[0] || '.png').toLowerCase();
    const filename = sanitizeFilename(`${slug}-${Date.now()}${ext}`);

    const categoryPath = category === 'TodayNews' ? 'today-news' : (category === 'PastNews' ? 'past-news' : 'misc');
    const destDir = path.join(process.cwd(), 'public', 'images', 'uploads', categoryPath);
    await fs.mkdir(destDir, { recursive: true });

    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const outPath = path.join(destDir, filename);
    await fs.writeFile(outPath, buffer);

    const publicUrl = `/images/uploads/${categoryPath}/${filename}`;
    return new Response(JSON.stringify({ url: publicUrl, name: filename }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Upload failed', detail: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
