"use client"

import Link from "next/link"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/contexts/AuthContext"
import { Logo } from "@/components/common/logo"

export function Navbar() {
  const { user, isAdmin } = useAuth()

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <div className="flex items-center space-x-4">
          <Logo height={32} />
          
          {/* Navigation Links */}
          <div className="flex items-center space-x-4 ml-4">
            {user && (
              <>
                <Link href="/users/orders">订单 · Orders</Link>
              </>
            )}
            {isAdmin && (
              <Link href="/admin/ai-chat" className="text-blue-600">
                管理 · Admin
              </Link>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center space-x-4">
          <UserMenu />
        </div>
      </div>
    </nav>
  )
} 
