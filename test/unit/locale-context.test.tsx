import { describe, it, expect } from 'vitest'
import React, { useEffect } from 'react'
import { render, waitFor } from '@testing-library/react'
import { LocaleProvider, useLocale } from '@/contexts/LocaleContext'

let externalSetLocale: ((l: 'en' | 'zh') => void) | null = null
function TestExposeSetter() {
  const { setLocale } = useLocale()
  useEffect(() => { externalSetLocale = setLocale }, [setLocale])
  return null
}

describe('LocaleProvider', () => {
  it('sets document lang on initial mount', async () => {
    render(
      <LocaleProvider initialLocale="en">
        <div />
      </LocaleProvider>
    )
    expect(document.documentElement.lang).toBe('en')
  })

  it('updates document lang when setLocale is called', async () => {
    render(
      <LocaleProvider initialLocale="en">
        <TestExposeSetter />
      </LocaleProvider>
    )
    expect(document.documentElement.lang).toBe('en')
    externalSetLocale?.('zh')
    await waitFor(() => {
      expect(document.documentElement.lang).toBe('zh')
    })
  })
})
