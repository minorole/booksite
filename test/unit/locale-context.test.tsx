import { describe, it, expect } from 'vitest'
import React, { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext'

let externalSetLocale: ((l: 'en' | 'zh') => void) | null = null
function TestExposeSetter() {
  const { setLocale } = useLocale()
  useEffect(() => { externalSetLocale = setLocale }, [setLocale])
  return null
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('LocaleProvider', () => {
  it('sets document lang on initial mount', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <LocaleProvider initialLocale="en">
          <div />
        </LocaleProvider>
      )
      await flush()
    })
    expect(document.documentElement.lang).toBe('en')
  })

  it('updates document lang when setLocale is called', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    await act(async () => {
      root.render(
        <LocaleProvider initialLocale="en">
          <TestExposeSetter />
        </LocaleProvider>
      )
      await flush()
    })
    expect(document.documentElement.lang).toBe('en')
    await act(async () => {
      externalSetLocale?.('zh')
      await flush()
    })
    expect(document.documentElement.lang).toBe('zh')
  })
})

