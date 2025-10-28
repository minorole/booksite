import { describe, it, expect, vi } from 'vitest'

// Mock AgentKit core and provider
vi.mock('@openai/agents-core', () => {
  class RunnerMock {
    constructor(_: any) {}
    async *run(_: any, __: any, ___: any) {
      // agent handoff event
      yield { type: 'agent_updated_stream_event', agent: { name: 'Vision' } }
      // assistant output
      yield {
        type: 'run_item_stream_event',
        name: 'message_output_created',
        item: { rawItem: { content: [{ type: 'output_text', text: 'Hello' }] } },
      }
      // also emit a delta-style event to mimic newer SDKs
      yield {
        type: 'run_item_stream_event',
        name: 'message_output_delta',
        item: { rawItem: { message: { delta: { type: 'output_text.delta', delta: '!' } } } },
      }
      // tool call
      yield {
        type: 'run_item_stream_event',
        name: 'tool_called',
        item: { rawItem: { type: 'function_call', callId: 'call_1', name: 'analyze_book_cover', arguments: { image_url: 'x' } } },
      }
      // tool result with JSON
      yield {
        type: 'run_item_stream_event',
        name: 'tool_output',
        item: {
          rawItem: {
            type: 'function_call_result',
            name: 'analyze_book_cover',
            callId: 'call_1',
            output: { type: 'json', json: { vision_analysis: { structured_data: { ok: true } } } },
          },
        },
      }
    }
  }
  return {
    user: (x: any) => x,
    assistant: (x: any) => x,
    system: (x: any) => x,
    // Minimal stub for tool factory used by agents/tools
    tool: (def: any) => ({ __mock: true, ...def }),
    Runner: RunnerMock,
  }
})
vi.mock('@openai/agents-openai', () => ({ OpenAIProvider: class {} }))
vi.mock('@/lib/admin/agents', () => ({ createAgentRegistry: () => ({ router: {} }) }))
vi.mock('@/lib/openai/models', () => ({ getModel: () => 'gpt-5-mini' }))
vi.mock('@/lib/db/admin', () => ({ logAdminAction: vi.fn(async () => {}) }))

import { runChatWithAgentsStream } from '@/lib/admin/chat/orchestrator-agentkit'

describe('orchestrator event mapping', () => {
  it('emits handoff, assistant_delta, tool events, and assistant_done', async () => {
    const events: any[] = []
    await runChatWithAgentsStream({ messages: [{ role: 'user', content: 'test' } as any], userEmail: 'admin@test', write: (e) => events.push(e) })

    const types = events.map((e) => e.type)
    expect(types).toContain('handoff')
    expect(types).toContain('assistant_delta')
    expect(types).toContain('tool_start')
    expect(types).toContain('tool_result')
    expect(types).toContain('tool_append')
    expect(types[types.length - 1]).toBe('assistant_done')

    const toolResult = events.find((e) => e.type === 'tool_result')
    expect(toolResult.result).toEqual({ vision_analysis: { structured_data: { ok: true } } })

    const toolAppend = events.find((e) => e.type === 'tool_append')
    const parsed = JSON.parse(toolAppend.message.content)
    expect(parsed).toEqual({ vision_analysis: { structured_data: { ok: true } } })
  })
})
