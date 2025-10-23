import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { Bilingual } from '@/components/common/bilingual'

describe('Bilingual', () => {
  it('renders Chinese when locale is zh', async () => {
    const { container } = render(
      <LocaleProvider initialLocale="zh">
        <Bilingual as="span" cnText="首页" enText="Home" />
      </LocaleProvider>
    )
    expect(container.textContent).toBe('首页')
  })

  it('renders English when locale is en', async () => {
    const { container } = render(
      <LocaleProvider initialLocale="en">
        <Bilingual as="span" cnText="首页" enText="Home" />
      </LocaleProvider>
    )
    expect(container.textContent).toBe('Home')
  })
})
