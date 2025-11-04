'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Bilingual } from '@/components/common/bilingual';
import type { Role } from '@/lib/db/enums';
import type { AdminUser } from '@/lib/admin/client/users';
import { RoleSelect } from './RoleSelect';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export function UsersTable({
  users,
  showRoleSelect = false,
  currentUserId,
  updatingId,
  onChangeRole,
  onViewOrders,
  loading,
}: {
  users: AdminUser[];
  showRoleSelect?: boolean;
  currentUserId?: string | null;
  updatingId?: string | null;
  onChangeRole?: (userId: string, role: Role) => void;
  onViewOrders?: (user: { id: string; email: string }) => void;
  loading?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>
            <Bilingual cnText="邮箱" enText="Email" />
          </TableHead>
          <TableHead>
            <Bilingual cnText="姓名" enText="Name" />
          </TableHead>
          <TableHead>
            <Bilingual cnText="角色" enText="Role" />
          </TableHead>
          <TableHead>
            <Bilingual cnText="加入日期" enText="Joined" />
          </TableHead>
          <TableHead>
            <Bilingual cnText="订单" enText="Orders" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading && users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="py-8">
              <div className="text-muted-foreground flex items-center justify-center gap-3 text-sm">
                <LoadingSpinner />
                <Bilingual cnText="正在加载…" enText="Loading..." />
              </div>
            </TableCell>
          </TableRow>
        ) : users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-muted-foreground py-8 text-center text-sm">
              <Bilingual cnText="暂无用户" enText="No users found." />
            </TableCell>
          </TableRow>
        ) : (
          users.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.email}</TableCell>
              <TableCell>{row.name || '-'}</TableCell>
              <TableCell>
                {showRoleSelect && onChangeRole ? (
                  <RoleSelect
                    value={row.role}
                    disabled={
                      updatingId === row.id || (!!currentUserId && currentUserId === row.id)
                    }
                    onChange={(value) => onChangeRole(row.id, value)}
                  />
                ) : (
                  row.role
                )}
              </TableCell>
              <TableCell>{new Date(row.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewOrders?.({ id: row.id, email: row.email })}
                >
                  <Bilingual cnText="查看" enText="View" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
