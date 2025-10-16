import { describe, it, expect, vi } from 'vitest'

// Mock redirect to throw with captured URL
vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw Object.assign(new Error('REDIRECT'), { url }) },
}))

// Helper to mock next/headers for specific Accept-Language
function mockHeaders(acceptLanguage: string) {
  vi.doMock('next/headers', () => ({
    headers: async () => new Headers([[ 'accept-language', acceptLanguage ]]),
  }))
}

describe('auth and admin redirects to localized routes', () => {
  it('auth/signin redirects based on Accept-Language', async () => {
    mockHeaders('zh-CN,zh;q=0.9')
    let mod = await import('@/app/auth/signin/page')
    await expect(mod.default()).rejects.toMatchObject({ url: '/zh/auth/signin' })

    // Reset module cache to apply new mock of next/headers
    vi.resetModules()
    mockHeaders('en-US,en;q=0.8')
    mod = await import('@/app/auth/signin/page')
    await expect(mod.default()).rejects.toMatchObject({ url: '/en/auth/signin' })
  })

  it('admin root redirects to localized admin/ai-chat', async () => {
    mockHeaders('zh-CN,zh;q=0.9')
    const modZh = await import('@/app/admin/page')
    await expect(modZh.default()).rejects.toMatchObject({ url: '/zh/admin/ai-chat' })
  })
})
