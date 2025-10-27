"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Role } from '@/lib/db/enums'
import { fetchUsersApi, type AdminUser } from '@/lib/admin/client/users'

export type UseUsersOptions = {
  initialLimit?: number
  hideSuperAdmin?: boolean
  enabled?: boolean
}

export function useUsers(opts: UseUsersOptions = {}) {
  const initialLimit = Number.isFinite(opts.initialLimit as number) ? Math.max(1, Math.min(Number(opts.initialLimit), 200)) : 50
  const enabled = opts.enabled !== false
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(initialLimit)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset to first page when search changes
  useEffect(() => { setPage(0) }, [debouncedQuery])

  const offset = useMemo(() => page * limit, [page, limit])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      const { users, total } = await fetchUsersApi({ q: debouncedQuery, limit, offset, hideSuperAdmin: !!opts.hideSuperAdmin, signal: ac.signal })
      setUsers(users)
      setTotal(typeof total === 'number' ? total : undefined)
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        setUsers([])
        setTotal(0)
        setError((e as Error)?.message || 'Failed to fetch users')
      }
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, limit, offset, opts.hideSuperAdmin])

  // Auto-refresh when query/page/limit or hideSuperAdmin changes
  useEffect(() => {
    if (!enabled) return
    void refresh()
  }, [refresh, enabled])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return {
    users,
    total,
    loading,
    error,
    query,
    setQuery,
    page,
    setPage,
    limit,
    setLimit,
    refresh,
  }
}
