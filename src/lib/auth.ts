import type { User, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase.generated'
import { env } from '@/lib/config/env'

export type Role = 'USER' | 'ADMIN' | 'SUPER_ADMIN'

export const LINK_EXPIRY_MS = 15 * 60 * 1000

export function isSafePath(p?: string): boolean {
  if (!p) return false
  if (!p.startsWith('/') || p.startsWith('//')) return false
  return true
}

export function buildCallbackUrl(origin: string, returnTo?: string): string {
  const qp = new URLSearchParams()
  if (isSafePath(returnTo)) qp.set('returnTo', returnTo!)
  qp.set('ts', String(Date.now()))
  return `${origin}/api/auth/callback?${qp.toString()}`
}

export function linkExpired(tsParam?: string | null): boolean {
  if (!tsParam) return false
  const ts = Number(tsParam)
  if (!Number.isFinite(ts)) return true
  return (Date.now() - ts) > LINK_EXPIRY_MS
}

export function deriveUserRole(email?: string | null): Role {
  try {
    return email === env.superAdminEmail() ? 'SUPER_ADMIN' : 'USER'
  } catch {
    return 'USER'
  }
}

export async function finalizePostLogin(
  supabase: SupabaseClient<Database>,
  user: User,
  role: Role
): Promise<void> {
  await supabase.auth.updateUser({ data: { role } })
  const meta = (user.user_metadata ?? null) as Record<string, unknown> | null
  const name = typeof meta?.name === 'string' ? (meta.name as string) : null
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        name,
        role,
      },
      { onConflict: 'id' }
    )
  if (error) {
    console.error('Profile upsert error:', error)
  }
}

export function computeRedirect(returnTo: string | undefined, origin: string): URL {
  return isSafePath(returnTo) ? new URL(returnTo!, origin) : new URL('/', origin)
}
