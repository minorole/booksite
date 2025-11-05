import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  normalizeRunItemToSSEEvents,
  normalizeAgentUpdatedToSSEEvents,
} from '@/lib/admin/chat/normalize-agent-events';
import type { NormalizedEvent } from '@/lib/admin/chat/normalize-agent-events';
import { SSEEvent } from '@/lib/admin/chat/contracts';

// Only the normalizer imports this; mock a minimal surface
vi.mock('@/lib/admin/agents/tools', () => ({
  getDomainToolNames: () => new Set(['analyze_book_cover', 'check_duplicates']),
}));

describe('Normalize agent events → SSE contract', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('emits tool_start and tool_result only for domain tools', () => {
    const startEv = normalizeRunItemToSSEEvents({
      name: 'tool_called',
      raw: {
        type: 'function_call',
        name: 'analyze_book_cover',
        callId: 'call-1',
        arguments: { image_url: 'https://x/y.jpg' },
      },
    });
    const resultEv = normalizeRunItemToSSEEvents({
      name: 'tool_output',
      raw: {
        type: 'function_call_result',
        name: 'analyze_book_cover',
        callId: 'call-1',
        output: { type: 'json', json: { title: 'Lotus Sutra' } },
      },
    });

    const all = [...startEv, ...resultEv];
    for (const e of all) expect(() => SSEEvent.parse(e)).not.toThrow();

    const start = all.find((e) => e.type === 'tool_start') as NormalizedEvent;
    const result = all.find((e) => e.type === 'tool_result') as NormalizedEvent;
    expect(start).toBeTruthy();
    expect(result).toBeTruthy();
    expect((start as any).id).toBe('call-1');
    expect((result as any).id).toBe('call-1');
  });

  it('filters non-domain tool calls', () => {
    const events = normalizeRunItemToSSEEvents({
      name: 'tool_called',
      raw: { type: 'function_call', name: 'internal_debug', callId: 'n/a', arguments: {} },
    });
    expect(events.length).toBe(0);
  });

  it('extracts assistant text deltas from common shapes', () => {
    const cases = [
      { content: [{ type: 'output_text', text: 'hello' }] },
      { type: 'output_text', text: 'world' },
      { type: 'output_text.delta', delta: '!' },
      { delta: { type: 'output_text.delta', delta: '🙂' } },
    ];
    const out = cases.flatMap((raw) => normalizeRunItemToSSEEvents({ name: 'message_delta', raw }));
    const deltas = out.filter((e) => e.type === 'assistant_delta') as NormalizedEvent[];
    for (const e of deltas) expect(() => SSEEvent.parse(e)).not.toThrow();
    expect(deltas.map((d: any) => d.content).join('')).toContain('hello');
    expect(deltas.map((d: any) => d.content).join('')).toContain('world');
    expect(deltas.map((d: any) => d.content).join('')).toContain('!');
    expect(deltas.map((d: any) => d.content).join('')).toContain('🙂');
  });

  it('normalizes agent handoffs', () => {
    const evs = normalizeAgentUpdatedToSSEEvents({ agent: { name: 'Vision' } });
    expect(evs).toEqual([{ type: 'handoff', to: 'Vision' }]);
    for (const e of evs) expect(() => SSEEvent.parse(e)).not.toThrow();
  });
});
