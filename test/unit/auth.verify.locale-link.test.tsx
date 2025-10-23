import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { LocaleProvider } from '@/contexts/LocaleContext'

// Mock useSearchParams to supply email/ts/returnTo
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('email=user@example.com&ts=0&returnTo=%2Ffoo'),
}))

// Mock AuthForm dependencies inside verify page? Not needed.

describe('Verify page links respect validated locale', () => {
  it('renders sign-in link with locale=zh', async () => {
    const mod = await import('@/app/[locale]/auth/verify/page')
    const Comp = mod.default
    const { container } = render(
      <LocaleProvider initialLocale="zh">
        <Comp />
      </LocaleProvider>
    )
    const links = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(links.some((href) => href?.startsWith('/zh/auth/signin'))).toBe(true)
  })

  it('renders sign-in link with locale=en', async () => {
    const mod = await import('@/app/[locale]/auth/verify/page')
    const Comp = mod.default
    const { container } = render(
      <LocaleProvider initialLocale="en">
        <Comp />
      </LocaleProvider>
    )
    const links = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(links.some((href) => href?.startsWith('/en/auth/signin'))).toBe(true)
  })
})
