import { NextResponse } from 'next/server';
import { env } from '@/lib/config/env';
import { withRequestContext } from '@/lib/runtime/request-context';
import { log } from '@/lib/logging';
import { maybeSendAlert } from '@/lib/alerts';
import { getAdminClient } from '@/lib/openai/client';
import { getModel } from '@/lib/openai/models';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const expected = env.adminTaskToken?.();
  if (!expected || token !== expected) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const requestId = (globalThis.crypto?.randomUUID?.() ||
    Math.random().toString(36).slice(2)) as string;
  try {
    const model = getModel('text');
    const start = Date.now();
    const result = await withRequestContext(requestId, async () => {
      const client = getAdminClient('text');
      const input = [
        {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: 'ping' }],
        },
      ] as any;
      // Minimal Responses API call
      return await client.responses.create({ model, input, max_output_tokens: 1 } as any);
    });
    const latency = Date.now() - start;
    log.info('admin_ai_health', 'ok', { latency_ms: latency, id: result?.id });
    return NextResponse.json(
      { ok: true, latency_ms: latency, model },
      { headers: { 'X-Request-ID': requestId } },
    );
  } catch (e) {
    const err = e as any;
    const fields = { message: err?.message || 'error', status: err?.status };
    log.error('admin_ai_health', 'degraded', fields);
    void maybeSendAlert('admin_ai_health', 'degraded', fields);
    return NextResponse.json(
      { ok: false, error: fields.message },
      { status: 500, headers: { 'X-Request-ID': requestId } },
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
