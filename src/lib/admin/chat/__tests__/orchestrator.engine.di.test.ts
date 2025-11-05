import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSEEvent } from '@/lib/admin/chat/contracts';

// Ensure only our domain tool passes
vi.mock('@/lib/admin/agents/tools', () => ({
  getDomainToolNames: () => new Set(['check_duplicates']),
}));

// Minimal registry: the orchestrator pulls router from createAgentRegistry
vi.mock('@/lib/admin/agents', () => ({
  createAgentRegistry: () => ({ router: {} }),
}));

describe('Orchestrator DI engine', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  it('uses injected engine stream and emits normalized SSE events', async () => {
    const fakeEngine = {
      async run() {
        async function* gen() {
          await Promise.resolve();
          yield {
            type: 'run_item_stream_event',
            name: 'message_delta',
            item: { rawItem: { type: 'output_text.delta', delta: 'A' } },
          };
          await Promise.resolve();
          yield {
            type: 'run_item_stream_event',
            name: 'tool_called',
            item: {
              rawItem: {
                type: 'function_call',
                name: 'check_duplicates',
                callId: '1',
                arguments: { title: 't' },
              },
            },
          };
          await Promise.resolve();
          yield {
            type: 'run_item_stream_event',
            name: 'tool_output',
            item: {
              rawItem: {
                type: 'function_call_result',
                name: 'check_duplicates',
                callId: '1',
                output: { type: 'json', json: { success: true, data: { has_duplicates: false } } },
              },
            },
          };
        }
        await Promise.resolve();
        return gen();
      },
    };

    vi.doMock('@/lib/admin/chat/orchestrator-engine', () => ({
      getOrchestratorEngine: () => fakeEngine,
    }));
    const { runChatWithAgentsStream } = await import('@/lib/admin/chat/orchestrator-agentkit');
    const events: any[] = [];
    const metrics: any[] = [];
    await runChatWithAgentsStream({
      messages: [{ role: 'user', content: 'hi' }] as any,
      userEmail: 'admin@example.com',
      write: (e) => events.push(e),
      onMetrics: (m) => metrics.push(m),
    });

    const types = events.map((e) => e.type);
    expect(types).toContain('assistant_delta');
    expect(types).toContain('tool_start');
    expect(types).toContain('tool_result');
    expect(types).toContain('tool_append');
    expect(types.at(-1)).toBe('assistant_done');

    for (const e of events) {
      if (
        [
          'assistant_delta',
          'assistant_done',
          'handoff',
          'tool_start',
          'tool_result',
          'tool_append',
        ].includes(e.type)
      ) {
        expect(() => SSEEvent.parse(e)).not.toThrow();
      }
    }
    expect(metrics.length).toBeGreaterThan(0);
  });
});
