"use client"

import { useMemo } from "react"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/contexts/AuthContext"
import { Bilingual } from "@/components/common/bilingual"
import { useLocale } from "@/contexts/LocaleContext"
import { PillNav } from "@/components/layout/pill-nav"
import type { PillNavItem } from "@/components/layout/pill-nav"
import { usePathname } from "next/navigation"
import { replaceLeadingLocale } from "@/lib/i18n/paths"

export function Navbar() {
  const { user, isAdmin } = useAuth()
  const { locale } = useLocale()
  const pathname = usePathname()

  const items = useMemo(() => {
    const arr: PillNavItem[] = [
      { href: `/${locale}`, label: <Bilingual cnText="首页" enText="Home" /> },
      {
        label: <Bilingual cnText="书籍与法物" enText="Books & Items" />,
        children: [
          { href: `/${locale}/books/pure-land`, label: <Bilingual cnText="净土佛书" enText="Pure Land" /> },
          { href: `/${locale}/books/others`, label: <Bilingual cnText="其他佛书" enText="Other Books" /> },
          { href: `/${locale}/items/dharma`, label: <Bilingual cnText="法宝" enText="Dharma Items" /> },
          { href: `/${locale}/items/statues`, label: <Bilingual cnText="佛像" enText="Buddha Statues" /> },
        ],
      },
    ]

    if (user) arr.push({ href: `/${locale}/users/orders`, label: <Bilingual cnText="订单" enText="Orders" /> })
    if (isAdmin) arr.push({ href: `/${locale}/admin/ai-chat`, label: <Bilingual cnText="管理" enText="Admin" /> })

    // Locale switch as pill links
    const current = pathname || `/${locale}`
    const zhHref = replaceLeadingLocale(current, 'zh')
    const enHref = replaceLeadingLocale(current, 'en')
    arr.push({ href: zhHref, label: '中文' })
    arr.push({ href: enHref, label: 'English' })

    // Auth control at the end
    if (user) {
      arr.push({ custom: <UserMenu /> })
    } else {
      arr.push({ href: `/${locale}/auth/signin`, label: <Bilingual cnText="登录" enText="Sign In" /> })
    }
    return arr
  }, [locale, user, isAdmin, pathname])

  return (
    <nav className="sticky top-0 z-30 bg-transparent">
      <div className="container mx-auto px-4">
        <div className={[
          "mt-4 mx-auto",
          "w-full md:max-w-5xl",
          "px-2 sm:px-4 py-2",
          "rounded-full",
        ].join(" ")}>
          <div className="flex items-center justify-between gap-4">
            <PillNav
              logoSrc="/logo.png"
              logoAlt="AMTBCF"
              logoHref={`/${locale}`}
              items={items}
              activeHref={pathname}
              baseColor="#000000"
              pillColor="#ffffff"
              hoveredPillTextColor="#ffffff"
              pillTextColor="#000000"
              className=""
              mobileToggleLabel={<Bilingual cnText="菜单" enText="Menu" />}
              mobileToggleOpenLabel={<Bilingual cnText="关闭" enText="Close" />}
              initialLoadAnimation={true}
            />
          </div>
        </div>
      </div>
    </nav>
  )
}
