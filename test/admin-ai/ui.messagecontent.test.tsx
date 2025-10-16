import { describe, it, expect } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { MessageContent } from '@/components/admin/ai-chat/MessageContent'

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('MessageContent tool renderers', () => {
  it('renders duplicate detection summary when present', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const payload = {
      data: {
        duplicate_detection: {
          matches: [{ similarity_score: 0.91 }, { similarity_score: 0.76 }],
          analysis: { recommendation: 'needs_review', confidence: 0.9, has_duplicates: true },
        },
      },
    }
    await act(async () => {
      root.render(
        <MessageContent
          message={{ role: 'tool', name: 'check_duplicates', content: JSON.stringify(payload) } as any}
          loading={false}
          onConfirmAnalysis={() => {}}
          onEditAnalysis={() => {}}
          onSelectImage={() => {}}
        />
      )
      await flush()
    })
    expect(container.textContent).toContain('Duplicate check complete')
    expect(container.textContent).toContain('Recommendation: needs_review')
    expect(container.textContent).toContain('Matches: 2')
  })
})

