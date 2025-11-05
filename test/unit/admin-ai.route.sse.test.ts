import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SSEEvent, RouteErrorEvent } from '@/lib/admin/chat/contracts'

// Mocks for auth + rate limit to let the route proceed
vi.mock('@/lib/security/guards', async () => {
  const UnauthorizedError = class extends Error { status = 401 }
  return {
    UnauthorizedError,
    assertAdmin: vi.fn(async () => ({ id: 'admin-1', email: 'admin@example.com' })),
  }
})

vi.mock('@/lib/security/ratelimit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, enabled: true, remaining: 10, limit: 20, reset: Date.now() + 1000 })),
  rateLimitHeaders: () => ({}),
  acquireConcurrency: vi.fn(async () => ({ enabled: true, acquired: true, current: 1, limit: 2 })),
  releaseConcurrency: vi.fn(async () => {}),
}))

// Replace the orchestrator with a stub that writes two events then resolves
vi.mock('@/lib/admin/chat/orchestrator-agentkit', () => ({
  runChatWithAgentsStream: vi.fn(async ({ write }: { write: (e: any) => void }) => {
    write({ type: 'assistant_delta', content: 'hello ' })
    write({ type: 'assistant_delta', content: 'world' })
    write({ type: 'assistant_done' })
  }),
}))

async function readSSE(response: Response, maxEvents = 10): Promise<any[]> {
  const out: any[] = []
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  while (out.length < maxEvents) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, idx)
      buf = buf.slice(idx + 2)
      for (const line of block.split('\n')) {
        const m = /^data:\s*(.*)$/.exec(line)
        if (m) {
          try {
            const evt = JSON.parse(m[1])
            out.push(evt)
          } catch {}
        }
      }
    }
  }
  return out
}

describe('POST /api/admin/ai-chat/stream/orchestrated (SSE)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('emits SSE with assistant deltas and done', async () => {
    const mod = await import('@/app/api/admin/ai-chat/stream/orchestrated/route')
    const body = JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })
    const req = new Request('http://localhost/api/admin/ai-chat/stream/orchestrated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })
    const rsp = await mod.POST(req)
    expect(rsp.status).toBe(200)
    expect(rsp.headers.get('Content-Type') || '').toContain('text/event-stream')
    const events = await readSSE(rsp, 10)
    // Should contain our two deltas and a final assistant_done
    const types = events.map((e) => e.type)
    expect(types).toContain('assistant_delta')
    expect(types).toContain('assistant_done')
    // Validate shape of each event using zod where applicable
    for (const ev of events) {
      if (ev.type === 'assistant_delta' || ev.type === 'assistant_done' || ev.type === 'handoff' || ev.type === 'tool_start' || ev.type === 'tool_result' || ev.type === 'tool_append') {
        expect(() => SSEEvent.parse(ev)).not.toThrow()
      } else if (ev.type === 'error') {
        expect(() => RouteErrorEvent.parse(ev)).not.toThrow()
      }
    }
  })
})
