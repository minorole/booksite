import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocaleProvider } from '@/contexts/LocaleContext'

let routerPush: ((path: string) => void) | undefined
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/books/pure-land',
  useRouter: () => ({ push: (path: string) => routerPush?.(path) }),
}))

describe('LanguageSwitch', () => {
  it('navigates to zh and en paths based on current pathname', async () => {
    const push = vi.fn()
    routerPush = push
    const { LanguageSwitch } = await import('@/components/layout/LanguageSwitch')
    render(
      <LocaleProvider initialLocale="en">
        <LanguageSwitch />
      </LocaleProvider>
    )

    const zh = await screen.findByText('中文')
    const en = await screen.findByText('English')

    fireEvent.click(zh)
    expect(push).toHaveBeenCalledWith('/zh/books/pure-land')

    fireEvent.click(en)
    expect(push).toHaveBeenCalledWith('/en/books/pure-land')
  })

  it('navigates correctly from zh to en', async () => {
    const push = vi.fn()
    routerPush = push
    vi.doMock('next/navigation', () => ({
      usePathname: () => '/zh/books/pure-land',
      useRouter: () => ({ push: (path: string) => routerPush?.(path) }),
    }))
    const { LanguageSwitch } = await import('@/components/layout/LanguageSwitch')
    render(
      <LocaleProvider initialLocale="zh">
        <LanguageSwitch />
      </LocaleProvider>
    )

    const en = await screen.findByText('English')
    fireEvent.click(en)
    expect(push).toHaveBeenCalledWith('/en/books/pure-land')
  })
})
