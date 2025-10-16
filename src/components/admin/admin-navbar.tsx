"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ChevronLeft } from "lucide-react"
import { useLocale } from "@/contexts/LocaleContext"

export function AdminNavbar() {
  const pathname = usePathname()
  const { locale } = useLocale()

  const navItems = [
    {
      href: `/${locale}/admin/ai-chat`,
      label: "AI Assistant"
    },
    {
      href: `/${locale}/admin/manual`,
      label: "Listing Management"
    }
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
            Back to Site
          </Link>
          
          <div className="h-4 w-[1px] bg-border" />
          
          <span className="font-semibold">Admin Panel</span>
          
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === item.href ? "text-foreground font-medium" : "text-foreground/60"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
} 
