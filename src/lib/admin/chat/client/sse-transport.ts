import type { Message } from '@/lib/admin/types';
import type { UILanguage } from '@/lib/admin/i18n';
import { ERROR_MESSAGES } from '@/lib/admin/i18n';
import { parseSSEEvent, type SSEEvent } from '@/lib/admin/types/events';

export async function streamOrchestrated(args: {
  messages: Message[];
  uiLanguage: UILanguage;
  signal: AbortSignal;
  onEvent: (evt: SSEEvent) => void;
  onRequestId?: (id: string | null) => void;
  url?: string;
}): Promise<void> {
  const { messages, uiLanguage, signal, onEvent, onRequestId, url } = args;
  const target = url || '/api/admin/ai-chat/stream/orchestrated';

  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, uiLanguage }),
    signal,
  });
  if (!res.ok || !res.body) {
    const headerReqId = res.headers?.get?.('X-Request-ID') || null;
    if (headerReqId) onRequestId?.(headerReqId);
    // Map common HTTP errors to localized messages
    const lang: UILanguage = uiLanguage || 'en';
    let msg: string = ERROR_MESSAGES[lang].network_error;
    if (res.status === 401) msg = ERROR_MESSAGES[lang].unauthorized;
    else if (res.status === 429) {
      const remaining = res.headers.get('X-RateLimit-Remaining');
      const reset = res.headers.get('X-RateLimit-Reset');
      msg =
        ERROR_MESSAGES[lang].rate_limited +
        (remaining ? ` (remaining: ${remaining}${reset ? `, reset: ${reset}s` : ''})` : '');
    } else if (res.status === 503) msg = ERROR_MESSAGES[lang].server_unavailable;
    else if (res.status >= 500) msg = ERROR_MESSAGES[lang].server_error;

    onEvent({ type: 'error', message: msg, request_id: headerReqId, version: '1' } as any);
    return;
  }

  const headerReqId = res.headers.get('X-Request-ID');
  if (headerReqId) onRequestId?.(headerReqId);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const findBoundary = (s: string): { idx: number; sepLen: number } => {
    const seps = ['\r\n\r\n', '\n\n', '\r\r'];
    for (const sep of seps) {
      const i = s.indexOf(sep);
      if (i !== -1) return { idx: i, sepLen: sep.length };
    }
    return { idx: -1, sepLen: 0 };
  };

  const processBlock = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    for (const ln of lines) {
      const line = ln.trim();
      if (!line.startsWith('data:')) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        const evt = parseSSEEvent(json);
        if (evt) {
          if ((evt as any).request_id) onRequestId?.((evt as any).request_id as string);
          onEvent(evt);
        }
      } catch {
        // ignore parse errors for partial lines
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      while (true) {
        const { idx, sepLen } = findBoundary(buffer);
        if (idx === -1) break;
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + sepLen);
        processBlock(raw);
      }
      if (buffer.trim().length > 0) processBlock(buffer);
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const { idx, sepLen } = findBoundary(buffer);
      if (idx === -1) break;
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + sepLen);
      processBlock(raw);
    }
  }
}

// Test helper: split a combined SSE payload string into blocks using common separators.
export function splitSSEBlocks(input: string): string[] {
  const out: string[] = [];
  let buffer = input;
  const find = (s: string): { idx: number; sepLen: number } => {
    const seps = ['\r\n\r\n', '\n\n', '\r\r'];
    for (const sep of seps) {
      const i = s.indexOf(sep);
      if (i !== -1) return { idx: i, sepLen: sep.length };
    }
    return { idx: -1, sepLen: 0 };
  };
  while (true) {
    const { idx, sepLen } = find(buffer);
    if (idx === -1) break;
    const raw = buffer.slice(0, idx);
    out.push(raw);
    buffer = buffer.slice(idx + sepLen);
  }
  if (buffer.trim().length > 0) out.push(buffer);
  return out;
}
