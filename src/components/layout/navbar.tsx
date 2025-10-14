"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/contexts/AuthContext"
import { Logo } from "@/components/common/logo"
import { Bilingual } from "@/components/common/bilingual"
import { useLocale } from "@/contexts/LocaleContext"
import { LanguageSwitch } from "@/components/layout/LanguageSwitch"

function AnimatedBilingualNavLink({
  href,
  cnText,
  enText,
  className,
}: {
  href: string
  cnText: React.ReactNode
  enText: React.ReactNode
  className?: string
}) {
  const measureRef = useRef<HTMLDivElement | null>(null)
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null)

  useEffect(() => {
    const el = measureRef.current
    if (!el) return
    const update = () => setMeasuredHeight(el.offsetHeight)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [cnText, enText])

  return (
    <Link href={href} className="group relative inline-block">
      <div
        className="relative overflow-hidden h-10 sm:h-11"
        style={measuredHeight ? { height: measuredHeight } : undefined}
      >
        <div className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
          <div ref={measureRef}>
            <Bilingual
              cnText={cnText}
              enText={enText}
              className={["text-sm sm:text-base", className].filter(Boolean).join(" ")}
              cnClassName="text-gray-600"
            />
          </div>
          <Bilingual
            cnText={cnText}
            enText={enText}
            className={["text-sm sm:text-base", className].filter(Boolean).join(" ")}
            cnClassName="text-gray-900"
            enClassName="text-gray-900 -mt-0.5"
          />
        </div>
      </div>
    </Link>
  )
}

export function Navbar() {
  const { user, isAdmin } = useAuth()
  const { locale } = useLocale()
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
              <Logo height={34} href={`/${locale}`} />
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <AnimatedBilingualNavLink href={`/${locale}`} cnText="首页" enText="Home" />
              <AnimatedBilingualNavLink href={`/${locale}/books/pure-land`} cnText="净土佛书" enText="Pure Land" />
              <AnimatedBilingualNavLink href={`/${locale}/books/others`} cnText="其他佛书" enText="Other Books" />
              <AnimatedBilingualNavLink href={`/${locale}/items/dharma`} cnText="法宝" enText="Dharma Items" />
              <AnimatedBilingualNavLink href={`/${locale}/items/statues`} cnText="佛像" enText="Buddha Statues" />
              {user && (
                <AnimatedBilingualNavLink href="/users/orders" cnText="订单" enText="Orders" />
              )}
              {isAdmin && (
                <AnimatedBilingualNavLink href="/admin/ai-chat" cnText="管理" enText="Admin" />
              )}
            </nav>

            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitch />
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
              <AnimatedBilingualNavLink href={`/${locale}`} cnText="首页" enText="Home" />
              <AnimatedBilingualNavLink href={`/${locale}/books/pure-land`} cnText="净土佛书" enText="Pure Land" />
              <AnimatedBilingualNavLink href={`/${locale}/books/others`} cnText="其他佛书" enText="Other Books" />
              <AnimatedBilingualNavLink href={`/${locale}/items/dharma`} cnText="法宝" enText="Dharma Items" />
              <AnimatedBilingualNavLink href={`/${locale}/items/statues`} cnText="佛像" enText="Buddha Statues" />
              {user && (
                <AnimatedBilingualNavLink href="/users/orders" cnText="订单" enText="Orders" />
              )}
              {isAdmin && (
                <AnimatedBilingualNavLink href="/admin/ai-chat" cnText="管理" enText="Admin" />
              )}
              <div className="pt-2">
                <LanguageSwitch />
              </div>
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
