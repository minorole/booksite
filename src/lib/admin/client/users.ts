import type { Role } from '@/lib/db/enums'

export type AdminUser = {
  id: string
  email: string
  name: string | null
  role: Role
  created_at: string
}

export async function fetchUsersApi(params: {
  q?: string
  limit?: number
  offset?: number
  hideSuperAdmin?: boolean
  signal?: AbortSignal
}): Promise<{ users: AdminUser[]; total?: number }> {
  const sp = new URLSearchParams()
  if (params.q && params.q.trim()) sp.set('q', params.q.trim())
  if (typeof params.limit === 'number') sp.set('limit', String(params.limit))
  if (typeof params.offset === 'number') sp.set('offset', String(params.offset))
  if (params.hideSuperAdmin) sp.set('hide_super_admin', 'true')
  const resp = await fetch(`/api/users?${sp.toString()}`, { signal: params.signal })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to fetch users')
  return { users: (data.users || []) as AdminUser[], total: data.total }
}

export async function updateUserRoleApi(userId: string, role: Role): Promise<void> {
  const resp = await fetch('/api/users/role', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, role }),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to update role')
}

export async function fetchUserOrdersApi(userId: string): Promise<{
  id: string
  status: string
  total_items: number
  created_at: string
  shipping_address: string
  order_items: Array<{ book: { title_en: string | null; title_zh: string | null }; quantity: number }>
}[]> {
  const resp = await fetch(`/api/users/${userId}/orders`)
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to fetch orders')
  return (data.orders || []) as any
}
