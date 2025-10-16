import { describe, it, expect } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { StepList } from '@/components/admin/ai-chat/StepList'

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('StepList handoff label', () => {
  it('renders "Handoff to Vision" for handoff events', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <StepList steps={[{ id: 'h1', name: 'handoff:Vision', status: 'done' }]} />
      )
      await flush()
    })
    expect(container.textContent).toContain('Handoff to Vision')
  })
})

