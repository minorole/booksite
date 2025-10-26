"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Role } from '@/lib/db/enums'
import { Bilingual } from '@/components/common/bilingual'

export function RoleSelect({
  value,
  disabled,
  onChange,
  confirmOnSuperAdminChange = true,
}: {
  value: Role
  disabled?: boolean
  onChange: (value: Role) => void
  confirmOnSuperAdminChange?: boolean
}) {
  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(v: Role) => {
        if (!confirmOnSuperAdminChange) { onChange(v); return }
        if (v === value) return
        const isGrantSuper = v === 'SUPER_ADMIN'
        const isDemoteSuper = value === 'SUPER_ADMIN' && v !== 'SUPER_ADMIN'
        if (isGrantSuper || isDemoteSuper) {
          const ok = window.confirm(
            isGrantSuper
              ? `Grant SUPER_ADMIN to this user?`
              : `Demote SUPER_ADMIN to ${v}?`
          )
          if (!ok) return
        }
        onChange(v)
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="USER"><Bilingual cnText="用户" enText="User" /></SelectItem>
        <SelectItem value="ADMIN"><Bilingual cnText="管理员" enText="Admin" /></SelectItem>
        <SelectItem value="SUPER_ADMIN"><Bilingual cnText="超级管理员" enText="Super Admin" /></SelectItem>
      </SelectContent>
    </Select>
  )
}

