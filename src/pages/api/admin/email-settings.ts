import type { APIRoute } from 'astro';
import { createDatabaseConnection } from '../../../lib/database';
import { getUserFromRequest, requireRole } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = getUserFromRequest(request);
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const prisma = createDatabaseConnection();
  try {
    const setting = await prisma.emailSettings.findFirst().catch(() => null);
    return new Response(JSON.stringify({
      success: true,
      data: setting || null
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, message: e?.message || 'Failed to load settings' }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = getUserFromRequest(request);
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const prisma = createDatabaseConnection();
  try {
    const body = await request.json();
    const sendingMode = (body?.sendingMode as string) || undefined; // 'immediate' | 'daily'
    const dailyTime = (body?.dailyTime as string) || undefined;
    const isEnabled = typeof body?.isEnabled === 'boolean' ? body.isEnabled : undefined;

    const data: any = {};
    if (sendingMode) data.sendingMode = sendingMode;
    if (dailyTime) data.dailyTime = dailyTime;
    if (typeof isEnabled === 'boolean') data.isEnabled = isEnabled;
    data.updatedBy = getUserFromRequest(request)?.id || 0;

    const exists = await prisma.emailSettings.findFirst();
    const saved = exists
      ? await prisma.emailSettings.update({ where: { id: exists.id }, data })
      : await prisma.emailSettings.create({ data });

    return new Response(JSON.stringify({ success: true, data: saved }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, message: e?.message || 'Failed to save settings' }), { status: 500 });
  }
};


