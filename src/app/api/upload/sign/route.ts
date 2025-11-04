import { NextResponse } from 'next/server';
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards';
import { env } from '@/lib/config/env';
import { CLOUDINARY_CONFIG } from '@/lib/admin/constants';
import { checkRateLimit, rateLimitHeaders } from '@/lib/security/ratelimit';

export async function GET(request: Request) {
  try {
    // Gate to admins only to prevent abuse of signing endpoint
    let user;
    try {
      user = await assertAdmin();
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      throw e;
    }

    // Rate limit per admin user
    const rl = await checkRateLimit({ route: '/api/upload/sign', userId: user.id });
    if (rl.enabled && !rl.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    // Ensure Cloudinary is configured
    env.cloudinaryUrl();
    const { v2: cloudinary } = await import('cloudinary');

    const url = new URL(request.url);
    const isTemp = url.searchParams.get('temp') === '1';
    const hash = url.searchParams.get('hash') || undefined;
    const rawPrefix = env.cloudinaryTempPrefix?.() || 'temp-uploads/';
    const tempFolder = rawPrefix.endsWith('/') ? rawPrefix.slice(0, -1) : rawPrefix;
    const folder = isTemp ? tempFolder : CLOUDINARY_CONFIG.FOLDER;
    const tags = isTemp ? 'temp' : '';

    const ts = Math.floor(Date.now() / 1000);
    // Params to sign for a direct signed upload
    const paramsToSign: Record<string, string | number> = {
      timestamp: ts,
      folder,
    };
    if (tags) paramsToSign.tags = tags;
    if (hash && /^[a-fA-F0-9]{40}$/.test(hash)) {
      paramsToSign.public_id = hash;
      paramsToSign.unique_filename = 'false';
      paramsToSign.overwrite = 'false';
    }
    // Include upload-time transformation for parity with server uploads
    // Convert CLOUDINARY_CONFIG.TRANSFORMATION to a string like 'q_auto:best,f_auto'
    const tr = CLOUDINARY_CONFIG.TRANSFORMATION?.[0];
    if (tr && tr.quality && tr.fetch_format) {
      const trStr = `q_${tr.quality},f_${tr.fetch_format}`;
      paramsToSign.transformation = trStr;
    }

    const cfg = cloudinary.config() as unknown as {
      cloud_name: string;
      api_key: string;
      api_secret?: string;
    };
    const apiSecret = cfg.api_secret ? String(cfg.api_secret) : '';
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
    const cloudName = cfg.cloud_name;
    const apiKey = cfg.api_key;

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    return NextResponse.json({
      upload_url: uploadUrl,
      cloud_name: cloudName,
      api_key: apiKey,
      params: {
        timestamp: ts,
        folder,
        tags,
        signature,
        // echo transformation if present so client can include it
        transformation: paramsToSign.transformation,
        public_id: paramsToSign.public_id,
        unique_filename: paramsToSign.unique_filename,
        overwrite: paramsToSign.overwrite,
      },
    });
  } catch (error) {
    console.error('sign upload failed', error);
    return NextResponse.json({ error: 'Failed to sign upload' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
