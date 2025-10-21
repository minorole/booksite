"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/LocaleContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserOrdersDialog } from '@/components/super-admin/UserOrdersDialog'
import type { Role } from '@/lib/db/enums'

type User = {
  id: string
  email: string
  name: string | null
  role: Role
  created_at: string
}

export default function AdminUsersPage() {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth()
  const router = useRouter()
  const { locale } = useLocale()
  const [users, setUsers] = useState<User[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [ordersFor, setOrdersFor] = useState<{ id: string; email: string } | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`)
      return
    }
    if (!loading && user && !isAdmin) {
      // If not admin, send to home
      router.push(`/${locale}`)
    }
  }, [loading, user, isAdmin, router, locale])

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
      params.set('limit', String(limit))
      params.set('offset', String(page * limit))
      const resp = await fetch(`/api/users?${params.toString()}`)
      const data = await resp.json()
      if (data.error) throw new Error(data.error)
      setUsers((data.users as User[]))
      setTotal(typeof data.total === 'number' ? data.total : undefined)
    } catch {
      // keep UI resilient; show empty state
      setUsers([])
      setTotal(0)
    }
  }, [debouncedQuery, page, limit])

  useEffect(() => { const t = setTimeout(() => setDebouncedQuery(query), 300); return () => clearTimeout(t) }, [query])
  useEffect(() => { setPage(0) }, [debouncedQuery])
  useEffect(() => { if (isAdmin) fetchUsers() }, [isAdmin, fetchUsers])

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading users…</div>
  if (!user || !isAdmin) return null

  const visibleUsers = isSuperAdmin ? users : users.filter(u => u.role !== 'SUPER_ADMIN')

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">User Management</h1>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Search by email or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select value={String(limit)} onValueChange={(v) => { setPage(0); setLimit(Number(v)) }}>
            <SelectTrigger className="w-[110px]"><SelectValue placeholder="50" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead>Orders</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleUsers.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.name || '-'}</TableCell>
              <TableCell>{row.role}</TableCell>
              <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setOrdersFor({ id: row.id, email: row.email }); setOrdersOpen(true) }}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {typeof total === 'number' ? (
            <>Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}</>
          ) : (
            <>Page {page + 1}</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</Button>
          <Button
            variant="outline"
            size="sm"
            disabled={typeof total === 'number' ? ((page + 1) * limit >= total) : (visibleUsers.length < limit)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
      <UserOrdersDialog open={ordersOpen} onOpenChange={(o) => { if (!o) setOrdersFor(null); setOrdersOpen(o) }} user={ordersFor} />
    </div>
  )
}

