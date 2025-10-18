import { describe, it, expect, vi } from 'vitest'

// Mock AgentKit core and provider to emit a tool_output with an envelope
vi.mock('@openai/agents-core', () => {
  class RunnerMock {
    constructor(_: any) {}
    async *run(_: any, __: any, ___: any) {
      // tool result with AdminOperationResult envelope
      yield {
        type: 'run_item_stream_event',
        name: 'tool_output',
        item: {
          rawItem: {
            type: 'function_call_result',
            name: 'search_books',
            callId: 'call_env_1',
            output: {
              type: 'json',
              json: {
                success: true,
                message: 'Found 0 book(s)',
                data: { search: { found: false, books: [] } },
              },
            },
          },
        },
      }
    }
  }
  return {
    user: (x: any) => x,
    assistant: (x: any) => x,
    system: (x: any) => x,
    Runner: RunnerMock,
  }
})
vi.mock('@openai/agents-openai', () => ({ OpenAIProvider: class {} }))
vi.mock('@/lib/admin/agents', () => ({ createAgentRegistry: () => ({ router: {} }) }))
vi.mock('@/lib/openai/models', () => ({ getModel: () => 'gpt-5-mini' }))
vi.mock('@/lib/db/admin', () => ({ logAdminAction: vi.fn(async () => {}) }))

import { runChatWithAgentsStream } from '@/lib/admin/chat/orchestrator-agentkit'

describe('orchestrator tool_result unwrapping', () => {
  it('emits tool_result.result as envelope.data and keeps tool_append as full envelope', async () => {
    const events: any[] = []
    await runChatWithAgentsStream({
      messages: [{ role: 'user', content: 'search books' } as any],
      userEmail: 'admin@test',
      write: (e) => events.push(e),
    })

    const toolResult = events.find((e) => e.type === 'tool_result')
    expect(toolResult).toBeTruthy()
    // Should unwrap to domain data only
    expect(toolResult.result).toEqual({ search: { found: false, books: [] } })
    expect(toolResult.success).toBe(true)

    const toolAppend = events.find((e) => e.type === 'tool_append')
    expect(toolAppend).toBeTruthy()
    const appended = JSON.parse(toolAppend.message.content)
    // The appended content should be the full envelope
    expect(appended).toEqual({ success: true, message: 'Found 0 book(s)', data: { search: { found: false, books: [] } } })
  })
})

