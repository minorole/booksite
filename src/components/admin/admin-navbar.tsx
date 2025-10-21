"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronLeft } from "lucide-react"
import { useLocale } from "@/contexts/LocaleContext"
import { Bilingual } from "@/components/common/bilingual"
import { useAuth } from "@/contexts/AuthContext"
import { UserMenu } from "@/components/auth/user-menu"
import { replaceLeadingLocale } from "@/lib/i18n/paths"

export function AdminNavbar() {
  const pathname = usePathname()
  const { locale } = useLocale()
  const { isSuperAdmin } = useAuth()

  const navItems = [
    {
      href: `/${locale}/admin/ai-chat`,
      label: <Bilingual cnText="AI 助手" enText="AI Assistant" />,
    },
    {
      href: `/${locale}/admin/manual`,
      label: <Bilingual cnText="清单管理" enText="Listing Management" />,
    },
    {
      href: `/${locale}/admin/users`,
      label: <Bilingual cnText="用户管理" enText="User Management" />,
    },
    ...(isSuperAdmin ? [{ href: `/${locale}/super-admin`, label: <Bilingual cnText="超级管理员" enText="Super Admin" /> }] as const : []),
  ]

  return (
    <nav className="border-b bg-muted/40">
      <div className="container mx-auto">
        <div className="flex h-14 items-center space-x-4 px-4">
          <Link 
            href={`/${locale}`}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mr-4"
          >
            <ChevronLeft className="h-4 w-4" />
            <Bilingual cnText="返回首页" enText="Back to Site" />
          </Link>
          
          <div className="h-4 w-[1px] bg-border" />
          
          <span className="font-semibold">
            <Bilingual cnText="管理面板" enText="Admin Panel" />
          </span>
          
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === item.href ? "text-foreground font-medium" : "text-foreground/60"
              )}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}

          {/* Right-side cluster: language switch + user menu */}
          <div className="ml-auto flex items-center gap-3">
            {(() => {
              const current = pathname || `/${locale}`
              const zhHref = replaceLeadingLocale(current, 'zh')
              const enHref = replaceLeadingLocale(current, 'en')
              return (
                <>
                  <Link
                    href={zhHref}
                    className={cn(
                      "transition-colors",
                      locale === 'zh' ? "text-foreground font-medium" : "text-foreground/60 hover:text-foreground/80"
                    )}
                    aria-current={locale === 'zh' ? 'page' : undefined}
                  >中文</Link>
                  <Link
                    href={enHref}
                    className={cn(
                      "transition-colors",
                      locale === 'en' ? "text-foreground font-medium" : "text-foreground/60 hover:text-foreground/80"
                    )}
                    aria-current={locale === 'en' ? 'page' : undefined}
                  >English</Link>
                </>
              )
            })()}
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  )
}
