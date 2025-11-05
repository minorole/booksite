import { NextResponse } from 'next/server';
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards';
import type { Message } from '@/lib/admin/types';
import { runChatWithAgentsStream } from '@/lib/admin/chat/orchestrator-agentkit';
import { withRequestContext } from '@/lib/runtime/request-context';
import {
  checkRateLimit,
  rateLimitHeaders,
  acquireConcurrency,
  releaseConcurrency,
} from '@/lib/security/ratelimit';
import { adminAiLogsEnabled, debugLogsEnabled } from '@/lib/observability/toggle';
import { log } from '@/lib/logging';
import { maybeSendAlert } from '@/lib/alerts';
import { ADMIN_AGENT_MAX_TURNS_DEFAULT } from '@/lib/admin/constants';
import { SSEEvent, RouteErrorEvent, SSE_VERSION } from '@/lib/admin/chat/contracts';

export async function POST(request: Request) {
  try {
    let user;
    try {
      user = await assertAdmin();
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
      throw e;
    }

    const { messages, uiLanguage }: { messages: Message[]; uiLanguage?: 'en' | 'zh' } =
      await request.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new NextResponse('Invalid request', { status: 400 });
    }

    const routeKey = '/api/admin/ai-chat/stream/orchestrated';
    const requestId = (globalThis.crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2)) as string;

    // Request start log
    if (adminAiLogsEnabled()) {
      try {
        log.info('admin_ai_route', 'request_start', {
          request_id: requestId,
          route: routeKey,
          userEmail: user.email,
          uiLanguage: uiLanguage || 'en',
          messageCount: messages.length,
        });
      } catch {}
    }

    // Rate limit per user
    const rl = await checkRateLimit({ route: routeKey, userId: user.id });
    if (rl.enabled && !rl.allowed) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: rateLimitHeaders(rl),
      });
    }

    if (adminAiLogsEnabled()) {
      try {
        log.info('admin_ai_route', 'ratelimit', {
          request_id: requestId,
          enabled: rl.enabled,
          allowed: rl.allowed,
          remaining: rl.remaining,
        });
      } catch {}
    }

    // Concurrency control per user
    const sem = await acquireConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 });
    if (sem.enabled && !sem.acquired) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: rateLimitHeaders(rl),
      });
    }
    if (adminAiLogsEnabled()) {
      try {
        log.info('admin_ai_route', 'concurrency', {
          request_id: requestId,
          enabled: sem.enabled,
          acquired: sem.acquired,
          current: sem.current,
          limit: sem.limit,
        });
      } catch {}
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        let metrics = { turns: 0, toolCalls: 0, handoffs: 0 };
        const write = (event: Record<string, unknown>) => {
          const enriched = { version: SSE_VERSION, request_id: requestId, ...event } as Record<
            string,
            unknown
          >;
          // Validate shape at the write boundary. Drop invalid events.
          {
            const t = (enriched as any)?.type;
            const result =
              t === 'error'
                ? RouteErrorEvent.safeParse(enriched)
                : SSEEvent.safeParse(enriched as any);
            if (!result.success) {
              try {
                log.warn('admin_ai_route', 'invalid_sse_event_dropped', {
                  request_id: requestId,
                  error: result.error?.message || 'validation_failed',
                });
              } catch {}
              return;
            }
          }
          if (adminAiLogsEnabled() && debugLogsEnabled()) {
            try {
              const t = (event as any)?.type;
              if (t !== 'assistant_delta') log.debug('admin_ai_route', 'sse_out', { type: t });
            } catch {}
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(enriched)}\n\n`));
        };
        // Agents decide next steps based solely on messages (including any user-confirmed info embedded in prior turns)
        // Wrap the run in a request-scoped context to enable per-request caches (e.g., URL validation)
        void withRequestContext(requestId, () =>
          runChatWithAgentsStream({
            messages,
            userEmail: user.email!,
            write,
            uiLanguage,
            requestId,
            onMetrics: (m) => {
              metrics = { ...metrics, ...m };
            },
          }),
        )
          .then(async () => {
            try {
              await releaseConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 });
            } catch (e) {
              log.warn('admin_ai_route', 'release_concurrency_failed', {
                request_id: requestId,
                error: (e as Error)?.message || String(e),
              });
            }
            if (adminAiLogsEnabled()) {
              try {
                log.info('admin_ai_route', 'stream_complete', { request_id: requestId });
              } catch {}
            }
            controller.close();
          })
          .catch((err) => {
            const e = err as any;
            const msg = (e?.message as string) || 'orchestrator error';
            // Best-effort extraction of tool name and JSON path from the error message
            const tool =
              typeof e?.functionName === 'string'
                ? (e.functionName as string)
                : /function '([^']+)'/.exec(msg)?.[1] || undefined;
            const contextPath = (() => {
              try {
                const m = /context=\(([^)]+)\)/.exec(msg);
                if (!m) return undefined;
                const parts = m[1]
                  .split(',')
                  .map((s) => s.replace(/['\s]/g, ''))
                  .filter(Boolean);
                // Drop structural markers like anyOf/properties and numeric indices
                return (
                  parts
                    .filter((p) => p !== 'anyOf' && p !== 'properties' && !/^\d+$/.test(p))
                    .join('.') || undefined
                );
              } catch {
                return undefined;
              }
            })();
            // Always log a structured error for operators
            try {
              const raw = process.env.AGENT_MAX_TURNS?.trim();
              const envMax = raw ? Number.parseInt(raw, 10) : NaN;
              const maxTurns =
                Number.isFinite(envMax) && envMax > 0 ? envMax : ADMIN_AGENT_MAX_TURNS_DEFAULT;
              const alertFields = {
                request_id: requestId,
                message: msg,
                tool,
                path: contextPath,
                code: e?.code,
                status: e?.status,
                metrics,
                maxTurns,
              } as Record<string, unknown>;
              log.error('admin_ai_route', 'orchestrator_error', alertFields);
              void maybeSendAlert('admin_ai_route', 'orchestrator_error', alertFields);
            } catch {}
            const payload = {
              version: SSE_VERSION,
              request_id: requestId,
              type: 'error',
              message: msg,
              tool,
              path: contextPath,
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            void releaseConcurrency({ route: routeKey, userId: user.id, ttlSeconds: 120 }).finally(
              () => controller.close(),
            );
          });
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Request-ID': requestId,
        ...rateLimitHeaders(rl),
      },
    });
  } catch (error) {
    if (adminAiLogsEnabled()) {
      try {
        const err = error as any;
        const routeErrorFields =
          err instanceof Error
            ? { message: err.message, stack: err.stack }
            : { error: String(err) };
        log.error('admin_ai_route', 'route_error', routeErrorFields);
        void maybeSendAlert('admin_ai_route', 'route_error', routeErrorFields);
      } catch {}
    }
    return new NextResponse('Stream error', { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;
