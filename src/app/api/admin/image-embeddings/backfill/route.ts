import { NextResponse } from 'next/server';
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards';
import { backfillMissingImageEmbeddingsClip } from '@/lib/admin/services/image-embeddings';
import { withRequestContext } from '@/lib/runtime/request-context';

export async function POST(request: Request) {
  try {
    try {
      await assertAdmin();
    } catch (e) {
      if (e instanceof UnauthorizedError) return new NextResponse('Unauthorized', { status: 401 });
      throw e;
    }

    const url = new URL(request.url);
    const limit = Number(url.searchParams.get('limit') || '100');
    const batch = Number(url.searchParams.get('batch') || '10');
    const requestId = (globalThis.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2)) as string;
    const result = await withRequestContext(requestId, () =>
      backfillMissingImageEmbeddingsClip(limit, batch),
    );
    return NextResponse.json(result);
  } catch (error) {
    return new NextResponse('Backfill error', { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
