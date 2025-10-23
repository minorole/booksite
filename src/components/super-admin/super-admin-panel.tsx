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
import { UserOrdersDialog } from '@/components/admin/users/UserOrdersDialog'
import { Bilingual } from '@/components/common/bilingual'
import { useLocale } from '@/contexts/LocaleContext'

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
  const [clip, setClip] = useState<{ ok: boolean; latency_ms?: number; model?: string; url?: string; error?: string } | null>(null)
  const [clipLoading, setClipLoading] = useState(false)
  const { toast } = useToast()
  const [updating, setUpdating] = useState<string | null>(null)
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(50)
  const [total, setTotal] = useState<number | undefined>(undefined)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [ordersFor, setOrdersFor] = useState<{ id: string; email: string } | null>(null)
  const { locale } = useLocale()

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
        title: <Bilingual cnText="错误" enText="Error" />,
        description: <Bilingual cnText="获取用户失败" enText="Failed to fetch users" />
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
      // Fetch CLIP health status
      ;(async () => {
        try {
          setClipLoading(true)
          const rsp = await fetch('/api/super-admin/clip/health', { cache: 'no-store' })
          const json = await rsp.json()
          if (!rsp.ok || !json.ok) {
            setClip({ ok: false, error: json?.error || `HTTP ${rsp.status}` })
          } else {
            setClip({ ok: true, latency_ms: json.latency_ms, model: json.details?.model, url: json.url })
          }
        } catch (e) {
          setClip({ ok: false, error: (e as Error)?.message || 'error' })
        } finally {
          setClipLoading(false)
        }
      })()
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
        title: <Bilingual cnText="成功" enText="Success" />,
        description: <Bilingual cnText="用户角色已更新" enText="User role updated successfully" />
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: <Bilingual cnText="错误" enText="Error" />,
        description: <Bilingual cnText="更新角色失败" enText="Failed to update role" />
      })
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return (
    <div className="p-6 text-sm text-muted-foreground">
      <Bilingual cnText="正在加载用户…" enText="Loading users…" />
    </div>
  )

  const authUser = user

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        <Bilingual cnText="用户管理" enText="User Management" />
      </h1>
      {/* CLIP health card */}
      <div className="mb-6 rounded-xl border p-4 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold"><Bilingual cnText="CLIP 向量服务健康" enText="CLIP Embeddings Health" /></h2>
            <p className="text-sm text-muted-foreground">
              <Bilingual cnText="Cloud Run（CPU 按需）" enText="Cloud Run (CPU on request)" />
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={async () => {
            try {
              setClipLoading(true)
              const rsp = await fetch('/api/super-admin/clip/health', { cache: 'no-store' })
              const json = await rsp.json()
              if (!rsp.ok || !json.ok) setClip({ ok: false, error: json?.error || `HTTP ${rsp.status}` })
              else setClip({ ok: true, latency_ms: json.latency_ms, model: json.details?.model, url: json.url })
            } catch (e) { setClip({ ok: false, error: (e as Error)?.message || 'error' }) }
            finally { setClipLoading(false) }
          }}>
            {clipLoading ? <Bilingual cnText="正在刷新" enText="Refreshing" /> : <Bilingual cnText="刷新" enText="Refresh" />}
          </Button>
        </div>
        <div className="mt-3 text-sm">
          {clip ? (
            clip.ok ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-green-600"><span className="h-2 w-2 rounded-full bg-green-600" /> <Bilingual cnText="在线" enText="Online" /></span>
                {typeof clip.latency_ms === 'number' && <span>{clip.latency_ms} ms</span>}
                {clip.model && <span>{clip.model}</span>}
                {clip.url && <a className="underline" href={clip.url} target="_blank" rel="noreferrer">{clip.url}</a>}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-red-600">
                <span className="h-2 w-2 rounded-full bg-red-600" />
                <span><Bilingual cnText="不可用" enText="Unavailable" /></span>
                {clip.error && <span className="text-muted-foreground">({clip.error})</span>}
              </div>
            )
          ) : (
            <span className="text-muted-foreground"><Bilingual cnText="正在检测…" enText="Checking…" /></span>
          )}
        </div>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder={locale === 'zh' ? '按邮箱或姓名搜索' : 'Search by email or name'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            <Bilingual cnText="每页行数" enText="Rows per page" />
          </span>
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
            <TableHead><Bilingual cnText="邮箱" enText="Email" /></TableHead>
            <TableHead><Bilingual cnText="姓名" enText="Name" /></TableHead>
            <TableHead><Bilingual cnText="角色" enText="Role" /></TableHead>
            <TableHead><Bilingual cnText="加入日期" enText="Joined" /></TableHead>
            <TableHead><Bilingual cnText="订单" enText="Orders" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                <Bilingual cnText="暂无用户" enText="No users found." />
              </TableCell>
            </TableRow>
          ) : users.map((row) => (
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
                    <SelectValue placeholder={locale === 'zh' ? '选择角色' : 'Select role'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER"><Bilingual cnText="用户" enText="User" /></SelectItem>
                    <SelectItem value="ADMIN"><Bilingual cnText="管理员" enText="Admin" /></SelectItem>
                    <SelectItem value="SUPER_ADMIN"><Bilingual cnText="超级管理员" enText="Super Admin" /></SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                {new Date(row.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setOrdersFor({ id: row.id, email: row.email }); setOrdersOpen(true) }}
                >
                  <Bilingual cnText="查看" enText="View" />
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
            disabled={typeof total === 'number' ? ((page + 1) * limit >= total) : (users.length < limit)}
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
