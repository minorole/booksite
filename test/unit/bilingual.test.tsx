import { describe, it, expect } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { Bilingual } from '@/components/common/bilingual'

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('Bilingual', () => {
  it('renders Chinese when locale is zh', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <LocaleProvider initialLocale="zh">
          <Bilingual as="span" cnText="首页" enText="Home" />
        </LocaleProvider>
      )
      await flush()
    })
    expect(container.textContent).toBe('首页')
  })

  it('renders English when locale is en', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <LocaleProvider initialLocale="en">
          <Bilingual as="span" cnText="首页" enText="Home" />
        </LocaleProvider>
      )
      await flush()
    })
    expect(container.textContent).toBe('Home')
  })
})

