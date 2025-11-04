'use client';

import { UserAvatar } from '@/components/auth/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { LogOut, Package, Shield, MapPin, Users } from 'lucide-react';
import { Bilingual } from '@/components/common/bilingual';
import { useLocale } from '@/contexts/LocaleContext';
import { cn } from '@/lib/utils';
import { HOVER_LIFT_SHADOW } from '@/lib/ui';

function GlowSignIn() {
  const { locale } = useLocale();
  return (
    <Link
      href={`/${locale}/auth/signin`}
      className={cn(
        HOVER_LIFT_SHADOW,
        'relative inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-neutral-50',
      )}
    >
      <Bilingual cnText="登录" enText="Sign In" />
    </Link>
  );
}

export function UserMenu() {
  const router = useRouter();
  const supabase = createClient();
  const { user, isSuperAdmin, isAdmin } = useAuth();
  const { locale } = useLocale();

  if (!user?.email) {
    return <GlowSignIn />;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}`);
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full p-0">
          <UserAvatar user={user} className="h-8 w-8" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm leading-none font-medium">
              <Bilingual as="span" cnText="账号" enText="Account" />
            </p>
            <p className="text-muted-foreground text-xs leading-none">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/users/orders`} className="flex cursor-pointer items-center">
            <Package className="mr-2 h-4 w-4" />
            <Bilingual as="span" cnText="我的订单" enText="My Orders" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/users/addresses`} className="flex cursor-pointer items-center">
            <MapPin className="mr-2 h-4 w-4" />
            <Bilingual as="span" cnText="我的地址" enText="My Addresses" />
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/admin/users`} className="flex cursor-pointer items-center">
              <Users className="mr-2 h-4 w-4" />
              <Bilingual as="span" cnText="用户管理" enText="User Management" />
            </Link>
          </DropdownMenuItem>
        )}
        {isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/super-admin`} className="flex cursor-pointer items-center">
              <Shield className="mr-2 h-4 w-4" />
              <Bilingual as="span" cnText="超级管理员" enText="Super Admin" />
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive flex cursor-pointer items-center"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <Bilingual as="span" cnText="退出登录" enText="Sign out" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
