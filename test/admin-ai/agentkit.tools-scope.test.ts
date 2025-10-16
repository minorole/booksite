import { describe, it, expect } from 'vitest'
import { getToolsForAgent } from '@/lib/admin/agents/tools'

describe('AgentKit tools scope', () => {
  it('router has no domain tools', () => {
    expect(getToolsForAgent('router').length).toBe(0)
  })
  it('vision includes analyze_book_cover and check_duplicates', () => {
    const names = getToolsForAgent('vision').map((t: any) => t.name)
    expect(names).toContain('analyze_book_cover')
    expect(names).toContain('check_duplicates')
    expect(names).toContain('analyze_item_photo')
  })
  it('inventory includes create/update/search', () => {
    const names = getToolsForAgent('inventory').map((t: any) => t.name)
    expect(names).toContain('create_book')
    expect(names).toContain('update_book')
    expect(names).toContain('search_books')
  })
  it('orders includes update_order only', () => {
    const names = getToolsForAgent('orders').map((t: any) => t.name)
    expect(names).toContain('update_order')
    expect(names).toContain('get_order')
    expect(names).toContain('search_orders')
    expect(names).not.toContain('create_book')
  })
})
