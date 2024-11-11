import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types/supabase'

export const createClient = () => {
  return createClientComponentClient<Database>()
}

// For server components only
export const createServerClient = async () => {
  const { cookies } = await import('next/headers')
  const { createServerComponentClient } = await import('@supabase/auth-helpers-nextjs')
  return createServerComponentClient<Database>({ cookies })
} 