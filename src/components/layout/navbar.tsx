"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/contexts/AuthContext"
import { Logo } from "@/components/common/logo"

function AnimatedNavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-block overflow-hidden h-6 flex items-center text-sm sm:text-base"
    >
      <div className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
        <span className="text-gray-600">{children}</span>
        <span className="text-gray-900">{children}</span>
      </div>
    </Link>
  )
}

export function Navbar() {
  const { user, isAdmin } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [shapeClass, setShapeClass] = useState("rounded-full")
  const shapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current)
    if (isOpen) {
      setShapeClass("rounded-xl")
    } else {
      shapeTimeoutRef.current = setTimeout(() => setShapeClass("rounded-full"), 250)
    }
    return () => {
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current)
    }
  }, [isOpen])

  return (
    <nav className="sticky top-0 z-30 bg-transparent">
      <div className="container mx-auto px-4">
        <div
          className={[
            "mt-4 mx-auto",
            "w-full md:w-auto md:max-w-5xl",
            "border border-neutral-200",
            "bg-white/85 supports-[backdrop-filter]:bg-white/70 backdrop-blur",
            "shadow-sm px-4 sm:px-6 py-3",
            "transition-[border-radius] duration-300 ease-out",
            shapeClass
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Logo height={28} />
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <AnimatedNavLink href="/">首页 · Home</AnimatedNavLink>
              {user && <AnimatedNavLink href="/users/orders">订单 · Orders</AnimatedNavLink>}
              {isAdmin && <AnimatedNavLink href="/admin/ai-chat">管理 · Admin</AnimatedNavLink>}
            </nav>

            <div className="hidden md:flex items-center">
              <UserMenu />
            </div>

            <button
              type="button"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => setIsOpen((v) => !v)}
              aria-expanded={isOpen}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              isOpen ? "max-h-96 pt-3" : "max-h-0 pt-0"
            }`}
          >
            <nav className="flex flex-col items-center gap-4">
              <Link href="/" className="text-gray-700 hover:text-gray-900">首页 · Home</Link>
              {user && (
                <Link href="/users/orders" className="text-gray-700 hover:text-gray-900">
                  订单 · Orders
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin/ai-chat" className="text-gray-700 hover:text-gray-900">
                  管理 · Admin
                </Link>
              )}
              <div className="pt-2">
                <UserMenu />
              </div>
            </nav>
          </div>
        </div>
      </div>
    </nav>
  )
} 
