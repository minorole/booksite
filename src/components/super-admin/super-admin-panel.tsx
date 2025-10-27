"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UsersTable } from '@/components/admin/users/UsersTable'
import { PaginationControls } from '@/components/common/PaginationControls'
import { UserOrdersDialog } from '@/components/admin/users/UserOrdersDialog'
import { Bilingual } from '@/components/common/bilingual'
import { useLocale } from '@/contexts/LocaleContext'
import { useUsers } from '@/lib/admin/hooks/use-users'
import { useUserRoleUpdate } from '@/lib/admin/hooks/use-update-user-role'
import type { Role } from '@/lib/db/enums'
import { useToast } from '@/hooks/use-toast'
import { ClipHealthCard } from '@/components/super-admin/ClipHealthCard'

export function SuperAdminPanel() {
  const { user, isSuperAdmin, loading } = useAuth()
  const router = useRouter()
  const { locale } = useLocale()
  const { toast } = useToast()

  const {
    users,
    total,
    loading: loadingUsers,
    query,
    setQuery,
    page,
    setPage,
    limit,
    setLimit,
    refresh,
  } = useUsers({ initialLimit: 50, hideSuperAdmin: false, enabled: isSuperAdmin })

  const { updating, changeRole } = useUserRoleUpdate()
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [ordersFor, setOrdersFor] = useState<{ id: string; email: string } | null>(null)

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push('/')
      return
    }
  }, [loading, isSuperAdmin, router])

  if (loading) return (
    <div className="p-6 text-sm text-muted-foreground">
      <Bilingual cnText="正在加载用户…" enText="Loading users…" />
    </div>
  )

  const authUser = user

  const handleRoleChange = async (userId: string, newRole: Role) => {
    try {
      await changeRole(userId, newRole)
      // optimistic local update
      await refresh()
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
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">
        <Bilingual cnText="用户管理" enText="User Management" />
      </h1>

      <ClipHealthCard />

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

      <UsersTable
        users={users}
        showRoleSelect
        currentUserId={authUser?.id ?? null}
        updatingId={updating}
        onChangeRole={handleRoleChange}
        onViewOrders={({ id, email }) => { setOrdersFor({ id, email }); setOrdersOpen(true) }}
        loading={loadingUsers}
      />

      <PaginationControls
        page={page}
        limit={limit}
        total={total}
        onPrev={() => { setPage((p) => Math.max(0, p - 1)) }}
        onNext={() => { setPage((p) => p + 1) }}
        disableNext={typeof total === 'number' ? ((page + 1) * limit >= total) : (users.length < limit)}
      />

      <UserOrdersDialog open={ordersOpen} onOpenChange={(o) => { if (!o) setOrdersFor(null); setOrdersOpen(o) }} user={ordersFor} />
    </div>
  )
}
