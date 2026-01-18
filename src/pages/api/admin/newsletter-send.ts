import type { APIRoute } from 'astro';
import { getUserFromRequest, requireRole } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = getUserFromRequest(request);
    requireRole(user, ['ADMIN']);
  } catch {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const cronSecret = import.meta.env.CRON_SECRET || 'imacx-newsletter-2024-secret';
  const origin = (() => { try { return new URL(request.url).origin; } catch { return ''; } })();
  const configuredBase = import.meta.env.SITE_BASE_URL || import.meta.env.PUBLIC_SITE_URL || '';
  const baseUrl = configuredBase || origin;

  if (!baseUrl) {
    return new Response(JSON.stringify({ success: false, message: 'Missing SITE_BASE_URL/PUBLIC_SITE_URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/newsletter/daily-send?forceToday=true`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
        'x-force-today': 'true'
      }
    });

    const rawText = await response.text();
    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { success: false, message: rawText || 'Invalid response from newsletter service' };
    }

    return new Response(JSON.stringify(payload), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send newsletter';
    return new Response(JSON.stringify({ success: false, message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
