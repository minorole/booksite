import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { User } from '@supabase/supabase-js'

export async function getAuthUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: cookieStore })
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

export function isSuperAdmin(user: User): boolean {
  const role = (user as any)?.user_metadata?.role
  return role === 'SUPER_ADMIN'
}

export function isAdmin(user: User): boolean {
  const role = (user as any)?.user_metadata?.role
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}

export class UnauthorizedError extends Error {
  status: number
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
    this.status = 401
  }
}

export async function assertUser(): Promise<User> {
  const user = await getAuthUser()
  if (!user) {
    throw new UnauthorizedError()
  }
  return user
}

export async function assertAdmin(): Promise<User> {
  const user = await assertUser()
  if (!isAdmin(user)) {
    throw new UnauthorizedError()
  }
  return user
}
