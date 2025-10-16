import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { LocaleProvider } from '@/contexts/LocaleContext'

let routerPush: ((path: string) => void) | undefined
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/books/pure-land',
  useRouter: () => ({ push: (...args: any[]) => routerPush?.(...args) }),
}))

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('LanguageSwitch', () => {
  it('navigates to zh and en paths based on current pathname', async () => {
    const push = vi.fn()
    routerPush = push
    const { LanguageSwitch } = await import('@/components/layout/LanguageSwitch')

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <LocaleProvider initialLocale="en">
          <LanguageSwitch />
        </LocaleProvider>
      )
      await flush()
    })

    const spans = Array.from(container.querySelectorAll('span'))
    const zh = spans.find((el) => el.textContent === '中文') as HTMLElement
    const en = spans.find((el) => el.textContent === 'English') as HTMLElement

    await act(async () => {
      zh?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
    })
    expect(push).toHaveBeenCalledWith('/zh/books/pure-land')

    await act(async () => {
      en?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
    })
    expect(push).toHaveBeenCalledWith('/en/books/pure-land')
  })

  it('navigates correctly from zh to en', async () => {
    const push = vi.fn()
    routerPush = push
    vi.doMock('next/navigation', () => ({
      usePathname: () => '/zh/books/pure-land',
      useRouter: () => ({ push: (...args: any[]) => routerPush?.(...args) }),
    }))
    const { LanguageSwitch } = await import('@/components/layout/LanguageSwitch')

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <LocaleProvider initialLocale="zh">
          <LanguageSwitch />
        </LocaleProvider>
      )
      await flush()
    })

    const spans = Array.from(container.querySelectorAll('span'))
    const en = spans.find((el) => el.textContent === 'English') as HTMLElement

    await act(async () => {
      en?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
    })
    expect(push).toHaveBeenCalledWith('/en/books/pure-land')
  })
})

