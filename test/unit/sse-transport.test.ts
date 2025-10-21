import { describe, it, expect } from 'vitest'
import { splitSSEBlocks } from '@/lib/admin/chat/client/sse-transport'
import { parseSSEEvent } from '@/lib/admin/types/events'

function makeEvent(type: string, extra: Record<string, unknown> = {}) {
  return `data: ${JSON.stringify({ version: '1', request_id: 'req123', type, ...extra })}`
}

describe('splitSSEBlocks', () => {
  it('splits on \n\n', () => {
    const payload = `${makeEvent('assistant_delta', { content: 'Hi' })}\n\n${makeEvent('assistant_done')}`
    const blocks = splitSSEBlocks(payload)
    expect(blocks.length).toBe(2)
    const evts = blocks.flatMap((b) => b.split(/\r?\n/).map((ln) => ln.trim()).filter((ln) => ln.startsWith('data:')).map((ln) => parseSSEEvent(ln.slice(5).trim()))).filter(Boolean)
    expect(evts.length).toBe(2)
    expect((evts[0] as any).type).toBe('assistant_delta')
    expect((evts[1] as any).type).toBe('assistant_done')
  })

  it('splits on \r\n\r\n', () => {
    const payload = `${makeEvent('assistant_delta', { content: 'Hello' })}\r\n\r\n${makeEvent('assistant_done')}`
    const blocks = splitSSEBlocks(payload)
    expect(blocks.length).toBe(2)
    const evts = blocks.flatMap((b) => b.split(/\r?\n/).map((ln) => ln.trim()).filter((ln) => ln.startsWith('data:')).map((ln) => parseSSEEvent(ln.slice(5).trim()))).filter(Boolean)
    expect(evts.length).toBe(2)
  })

  it('splits on \r\r and parses multiple lines per block', () => {
    const block1 = `${makeEvent('handoff', { to: 'router' })}\n${makeEvent('assistant_delta', { content: 'A' })}`
    const payload = `${block1}\r\r${makeEvent('assistant_done')}`
    const blocks = splitSSEBlocks(payload)
    expect(blocks.length).toBe(2)
    const evts = blocks.flatMap((b) => b.split(/\r?\n/).map((ln) => ln.trim()).filter((ln) => ln.startsWith('data:')).map((ln) => parseSSEEvent(ln.slice(5).trim()))).filter(Boolean)
    expect(evts.length).toBe(3)
    expect((evts[0] as any).type).toBe('handoff')
    expect((evts[1] as any).type).toBe('assistant_delta')
    expect((evts[2] as any).type).toBe('assistant_done')
  })
})

