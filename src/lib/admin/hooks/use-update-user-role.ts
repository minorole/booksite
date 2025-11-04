'use client';

import { useState } from 'react';
import type { Role } from '@/lib/db/enums';
import { updateUserRoleApi } from '@/lib/admin/client/users';

export function useUserRoleUpdate() {
  const [updating, setUpdating] = useState<string | null>(null);

  const changeRole = async (userId: string, newRole: Role) => {
    setUpdating(userId);
    try {
      await updateUserRoleApi(userId, newRole);
    } finally {
      setUpdating(null);
    }
  };

  return { updating, changeRole };
}
