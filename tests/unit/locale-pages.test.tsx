import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation notFound for assert() behavior
vi.mock('next/navigation', () => ({
  notFound: () => { const e: any = new Error('NEXT_NOT_FOUND'); e.digest = 'NEXT_NOT_FOUND'; throw e },
}))

describe('[locale] server entries assert params', () => {
  it('layout rejects invalid locale', async () => {
    const mod = await import('@/app/[locale]/layout')
    await expect(mod.default({ children: null as any, params: Promise.resolve({ locale: 'xx' }) } as any)).rejects.toHaveProperty('digest', 'NEXT_NOT_FOUND')
  })

  it('generateMetadata rejects invalid locale', async () => {
    const mod = await import('@/app/[locale]/page')
    await expect(mod.generateMetadata({ params: Promise.resolve({ locale: 'xx' }) } as any)).rejects.toHaveProperty('digest', 'NEXT_NOT_FOUND')
  })

  it('signin page rejects invalid locale', async () => {
    const mod = await import('@/app/[locale]/auth/signin/page')
    await expect(mod.default({ params: Promise.resolve({ locale: 'xx' }) } as any)).rejects.toHaveProperty('digest', 'NEXT_NOT_FOUND')
  })
})

