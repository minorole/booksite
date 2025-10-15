"use client"

import { UserAvatar } from "@/components/auth/UserAvatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import Link from "next/link"
import { LogOut, Package, Settings, Shield } from "lucide-react"
import { Bilingual } from "@/components/common/bilingual"
import { useLocale } from "@/contexts/LocaleContext"

function GlowSignIn() {
  const { locale } = useLocale()
  return (
    <Link
      href={`/${locale}/auth/signin`}
      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 rounded-full bg-white shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:-translate-y-0.5 hover:bg-neutral-50 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300"
    >
      <Bilingual cnText="登录" enText="Sign In" />
    </Link>
  )
}

export function UserMenu() {
  const router = useRouter()
  const supabase = createClient()
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const { locale } = useLocale()

  if (!user?.email) {
    return <GlowSignIn />
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

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
            <p className="text-sm font-medium leading-none">
              <Bilingual as="span" cnText="账号" enText="Account" />
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${locale}/users/orders`} className="cursor-pointer flex items-center">
            <Package className="mr-2 h-4 w-4" />
            <Bilingual as="span" cnText="我的订单" enText="My Orders" />
          </Link>
        </DropdownMenuItem>
        {(isAdmin || isSuperAdmin) && (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/admin`} className="cursor-pointer flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <Bilingual as="span" cnText="管理后台" enText="Admin Panel" />
            </Link>
          </DropdownMenuItem>
        )}
        {isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link href={`/${locale}/super-admin`} className="cursor-pointer flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              <Bilingual as="span" cnText="用户管理" enText="User Management" />
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer flex items-center text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <Bilingual as="span" cnText="退出登录" enText="Sign out" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 
