import { vi } from 'vitest'

export function mockCookies(initial: Array<{ name: string; value: string }> = []) {
  vi.mock('next/headers', () => ({
    cookies: async () => ({
      getAll: () => initial,
      get: (name: string) => initial.find((c) => c.name === name),
      set: (_: any) => void 0,
    }),
    headers: async () => new Headers(),
  }))
}

export function mockNavigation(overrides: Partial<Record<'redirect' | 'notFound', any>> = {}) {
  vi.mock('next/navigation', () => ({
    redirect: overrides.redirect ?? ((url: string) => { throw Object.assign(new Error('REDIRECT'), { url }) }),
    notFound: overrides.notFound ?? (() => { const e: any = new Error('NEXT_NOT_FOUND'); e.digest = 'NEXT_NOT_FOUND'; throw e }),
  }))
}

