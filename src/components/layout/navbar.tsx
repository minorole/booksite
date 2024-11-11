"use client"

import Link from "next/link"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/contexts/AuthContext"

export function Navbar() {
  const { user, isAdmin } = useAuth()

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 container mx-auto">
        <div className="flex items-center space-x-4">
          <Link href="/" className="font-bold">
            Free Marketplace
          </Link>
          
          {/* Navigation Links */}
          <div className="flex items-center space-x-4 ml-4">
            <Link href="/products">Products</Link>
            {user && (
              <>
                <Link href="/orders">Orders</Link>
                <Link href="/profile">Profile</Link>
              </>
            )}
            {isAdmin && (
              <Link href="/admin" className="text-blue-600">
                Admin
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