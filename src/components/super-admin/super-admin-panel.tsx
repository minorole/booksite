"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from '@/hooks/use-toast'
import { type Role } from '@/lib/db/enums'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type User = {
  id: string
  email: string
  name: string | null
  role: Role
  created_at: string
}

export function SuperAdminPanel() {
  const { user, isSuperAdmin, loading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const { toast } = useToast()
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState<number | undefined>(undefined)

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
      params.set('limit', String(limit))
      params.set('offset', String(page * limit))
      const response = await fetch(`/api/users?${params.toString()}`)
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      setUsers((data.users as User[]))
      setTotal(typeof data.total === 'number' ? data.total : undefined)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users"
      })
    }
  }, [toast, debouncedQuery, page, limit])

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push('/')
      return
    }
    if (!loading && isSuperAdmin) {
      fetchUsers()
    }
  }, [loading, isSuperAdmin, router, fetchUsers])

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Reset to first page when search changes
  useEffect(() => { setPage(0) }, [debouncedQuery])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setUpdating(userId)
    try {
      const response = await fetch('/api/users/role', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      })
      
      const data = await response.json()
      if (data.error) throw new Error(data.error)
      
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)))
      
      toast({
        title: "Success",
        description: "User role updated successfully"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role"
      })
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading users…</div>

  const authUser = user

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
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.name || '-'}</TableCell>
              <TableCell>
                <Select
                  disabled={updating === row.id || (authUser?.id === row.id)}
                  value={row.role}
                  onValueChange={async (value: Role) => {
                    if (value === row.role) return
                    const isGrantSuper = value === 'SUPER_ADMIN'
                    const isDemoteSuper = row.role === 'SUPER_ADMIN' && value !== 'SUPER_ADMIN'
                    if (isGrantSuper || isDemoteSuper) {
                      const ok = window.confirm(
                        isGrantSuper
                          ? `Grant SUPER_ADMIN to ${row.email}?`
                          : `Demote SUPER_ADMIN ${row.email}?`
                      )
                      if (!ok) return
                    }
                    await handleRoleChange(row.id, value)
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {new Date(row.created_at).toLocaleDateString()}
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
            disabled={typeof total === 'number' ? ((page + 1) * limit >= total) : (users.length < limit)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
