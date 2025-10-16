import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { LocaleProvider } from '@/contexts/LocaleContext'

// Capture items passed to PillNav
let lastItems: any[] | undefined
vi.mock('@/components/layout/pill-nav', () => ({
  PillNav: (props: any) => {
    lastItems = props.items
    return (
      <nav>
        {(props.items || []).flatMap((it: any, i: number) => (
          [
            it.href ? <a key={`i-${i}`} href={it.href}>{typeof it.label === 'string' ? it.label : String(it.label)}</a> : null,
            ...(it.children || []).map((ch: any, j: number) => (
              <a key={`c-${i}-${j}`} href={ch.href}>{typeof ch.label === 'string' ? ch.label : String(ch.label)}</a>
            )),
          ]
        ))}
      </nav>
    )
  },
}))

// Mock Auth context to avoid supabase
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null, isAdmin: false }),
  AuthProvider: ({ children }: any) => <>{children}</>,
}))

// Mock router pathname for link generation
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/books/pure-land',
}))

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('Navbar language links', () => {
  beforeEach(() => { lastItems = undefined })

  it('renders zh/en links based on current pathname (desktop/mobile data)', async () => {
    const { Navbar } = await import('@/components/layout/navbar')

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <LocaleProvider initialLocale="en">
          <Navbar />
        </LocaleProvider>
      )
      await flush()
    })

    // Items should include zh/en links derived from current pathname
    expect(Array.isArray(lastItems)).toBe(true)
    const hrefs = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(hrefs).toContain('/zh/books/pure-land')
    expect(hrefs).toContain('/en/books/pure-land')
    // Should include sign-in link when user is not signed in
    expect(hrefs).toContain('/en/auth/signin')
  })

  it('includes admin/users links when authenticated admin', async () => {
    vi.doMock('@/contexts/AuthContext', () => ({
      useAuth: () => ({ user: { id: '1' }, isAdmin: true }),
      AuthProvider: ({ children }: any) => <>{children}</>,
    }))
    vi.resetModules()
    const { Navbar } = await import('@/components/layout/navbar')
    const { LocaleProvider: Provider } = await import('@/contexts/LocaleContext')

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <Provider initialLocale="en">
          <Navbar />
        </Provider>
      )
      await flush()
    })

    const hrefs = Array.from(container.querySelectorAll('a')).map(a => a.getAttribute('href'))
    expect(hrefs).toContain('/en/users/orders')
    expect(hrefs).toContain('/en/admin/ai-chat')
  })
})
