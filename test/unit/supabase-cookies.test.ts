import { describe, it, expect, vi, beforeEach } from 'vitest'

// Wire env vars used by the client factory
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon'

// Record set() calls made by our cookie adapter
const setCalls: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []

vi.mock('next/headers', () => {
  return {
    // In our code we do: const store = await cookies()
    cookies: () => ({
      getAll: () => [],
      set: ({ name, value, ...options }: { name: string; value: string } & Record<string, unknown>) => {
        setCalls.push({ name, value, options })
      },
      get: (_name: string) => undefined,
    }),
  }
})

// Mock the SSR client to immediately call options.cookies.setAll so we can assert forwarding of options
vi.mock('@supabase/ssr', async () => {
  return {
    createServerClient: (_url: string, _key: string, options: any) => {
      // Simulate library applying cookies with options
      options.cookies.setAll([
        { name: 'sb-access-token', value: 'abc', options: { path: '/', sameSite: 'lax' } },
        { name: 'sb-refresh-token', value: 'def', options: { path: '/', sameSite: 'lax' } },
      ])
      return { auth: {} }
    },
  }
})

describe('Supabase cookie adapter', () => {
  beforeEach(() => {
    setCalls.length = 0
  })

  it('forwards cookie options via setAll()', async () => {
    const { createRouteSupabaseClient } = await import('@/lib/supabase')
    await createRouteSupabaseClient()
    // We expect our adapter to call Next cookies().set two times, preserving options like path
    const names = setCalls.map(c => c.name)
    expect(names).toContain('sb-access-token')
    expect(names).toContain('sb-refresh-token')
    const one = setCalls.find(c => c.name === 'sb-access-token')!
    expect(one.value).toBe('abc')
    expect(one.options).toMatchObject({ path: '/' })
  })
})

