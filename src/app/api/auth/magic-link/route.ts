import { NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase';
import { buildCallbackUrl } from '@/lib/auth';
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/ratelimit';

function getClientIp(request: Request): string | undefined {
  const fwd = request.headers.get('x-forwarded-for') || '';
  if (fwd) return fwd.split(',')[0]?.trim();
  const real = request.headers.get('x-real-ip') || undefined;
  return real || undefined;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  try {
    const body = await request.json().catch(() => ({}));
    const email = (body?.email as string | undefined)?.trim();
    const returnTo = (body?.returnTo as string | undefined) || undefined;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const rl = await checkRateLimit({ route: '/api/auth/magic-link', ip });
    const headers = rateLimitHeaders(rl);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
    }

    // Build safe redirect to our callback with optional returnTo and timestamp for 15-min expiry enforcement
    const emailRedirectTo = buildCallbackUrl(origin, returnTo);

    const supabase = await createRouteSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400, headers });
    }

    return NextResponse.json({ ok: true }, { headers });
  } catch (e) {
    console.error('magic-link error', e);
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
