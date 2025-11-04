'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/contexts/LocaleContext';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserOrdersDialog } from '@/components/admin/users/UserOrdersDialog';
import { Bilingual } from '@/components/common/bilingual';
import { UsersTable } from '@/components/admin/users/UsersTable';
import { PaginationControls } from '@/components/common/PaginationControls';
import { useUsers } from '@/lib/admin/hooks/use-users';

export default function AdminUsersPage() {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const router = useRouter();
  const { locale } = useLocale();
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersFor, setOrdersFor] = useState<{ id: string; email: string } | null>(null);

  const {
    users,
    total,
    loading: usersLoading,
    query,
    setQuery,
    page,
    setPage,
    limit,
    setLimit,
  } = useUsers({ initialLimit: 50, hideSuperAdmin: !isSuperAdmin, enabled: isAdmin });

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/${locale}/auth/signin`);
      return;
    }
    if (!loading && user && !isAdmin) {
      router.push(`/${locale}`);
      return;
    }
  }, [loading, user, isAdmin, router, locale]);

  if (loading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        <Bilingual cnText="正在加载用户…" enText="Loading users…" />
      </div>
    );
  if (!user || !isAdmin) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">
        <Bilingual cnText="用户管理" enText="User Management" />
      </h1>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder={locale === 'zh' ? '按邮箱或姓名搜索' : 'Search by email or name'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-muted-foreground text-sm">
            <Bilingual cnText="每页行数" enText="Rows per page" />
          </span>
          <Select
            value={String(limit)}
            onValueChange={(v) => {
              setPage(0);
              setLimit(Number(v));
            }}
          >
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="50" />
            </SelectTrigger>
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
        showRoleSelect={false}
        onViewOrders={({ id, email }) => {
          setOrdersFor({ id, email });
          setOrdersOpen(true);
        }}
        loading={usersLoading}
      />

      <PaginationControls
        page={page}
        limit={limit}
        total={total}
        onPrev={() => {
          setPage((p) => Math.max(0, p - 1));
        }}
        onNext={() => {
          setPage((p) => p + 1);
        }}
        disableNext={typeof total === 'number' ? (page + 1) * limit >= total : users.length < limit}
      />

      <UserOrdersDialog
        open={ordersOpen}
        onOpenChange={(o) => {
          if (!o) setOrdersFor(null);
          setOrdersOpen(o);
        }}
        user={ordersFor}
      />
    </div>
  );
}
