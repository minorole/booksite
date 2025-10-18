import type { Database } from '@/types/supabase.generated'
import { env } from '@/lib/config/env'

// For client components: use @supabase/ssr browser client
export const createClient = () => {
  const { createBrowserClient } = require('@supabase/ssr') as typeof import('@supabase/ssr')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createBrowserClient<Database>(url, anon)
}

// For server components and loaders (read-only cookie adapter)
export const createServerSupabaseClient = async () => {
  const { cookies } = await import('next/headers')
  const { createServerClient } = await import('@supabase/ssr')
  const store = await cookies()

  return createServerClient<Database>(
    env.supabaseUrl(),
    env.supabaseAnonKey(),
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        get(name: string) {
          return store.get(name)?.value
        },
        set() {
          // No-op in RSC; writes handled in route handlers/middleware
        },
        remove() {
          // No-op in RSC; writes handled in route handlers/middleware
        },
      },
    }
  )
}

// For route handlers (read/write cookie adapter)
export const createRouteSupabaseClient = async () => {
  const { cookies } = await import('next/headers')
  const { createServerClient } = await import('@supabase/ssr')
  const store = await cookies()

  return createServerClient<Database>(
    env.supabaseUrl(),
    env.supabaseAnonKey(),
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      },
      cookies: {
        getAll() {
          return store.getAll().map(c => ({ name: c.name, value: c.value }))
        },
        setAll(setCookies: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          for (const { name, value, options } of setCookies) {
            store.set({ name, value, ...(options as Record<string, unknown> | undefined) })
          }
        },
      },
    }
  )
}
