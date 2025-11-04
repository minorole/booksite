import { NextResponse } from 'next/server';
import { env } from '@/lib/config/env';

export async function POST(request: Request) {
  try {
    // Ensure Cloudinary is configured (secret used for signature verification)
    env.cloudinaryUrl();
    const { v2: cloudinary } = await import('cloudinary');

    const signature =
      request.headers.get('x-cld-signature') || request.headers.get('X-Cld-Signature') || undefined;
    const tsHeader =
      request.headers.get('x-cld-timestamp') || request.headers.get('X-Cld-Timestamp') || undefined;
    const timestamp = tsHeader ? Number(tsHeader) : undefined;
    const bodyText = await request.text();

    if (!signature || !timestamp || !Number.isFinite(timestamp)) {
      return NextResponse.json({ ok: false, error: 'Missing signature headers' }, { status: 400 });
    }

    // Verify signature using Cloudinary utils (default validity 2h)
    const ok = cloudinary.utils.verifyNotificationSignature(bodyText, timestamp, signature);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 401 });
    }

    // Attempt to parse the payload (JSON preferred, else URL-encoded)
    let payload: unknown = null;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      try {
        const sp = new URLSearchParams(bodyText);
        payload = Object.fromEntries(sp.entries());
      } catch {
        payload = null;
      }
    }

    // For now we only acknowledge; future: persist or trigger post-processing
    return NextResponse.json({ ok: true, received: !!payload });
  } catch (error) {
    console.error('cloudinary webhook error', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
