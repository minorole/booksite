import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/supabase.generated'

// For client components
export const createClient = () => {
  return createClientComponentClient<Database>()
}

// For server components and API routes
export const createServerSupabaseClient = async () => {
  const { cookies } = await import('next/headers')
  const { createServerClient } = await import('@supabase/ssr')
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value ?? ''
        },
        set(name: string, value: string, options: any) {
          // This is handled by Supabase Auth middleware
        },
        remove(name: string, options: any) {
          // This is handled by Supabase Auth middleware
        },
      },
    }
  )
} 
