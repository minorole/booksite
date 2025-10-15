"use client"

import { cn } from "@/lib/utils"
import { DesktopMenu } from "./pill/DesktopMenu"
import { MobileMenu } from "./pill/MobileMenu"
import { LogoButton } from "./pill/LogoButton"
export type { PillNavItem } from "./pill/types"
// Using the standalone LogoButton for desktop to match the original style and avoid image sizing quirks

type PillNavProps = {
  logoSrc: string
  logoAlt?: string
  logoHref?: string
  items: import("./pill/types").PillNavItem[]
  activeHref?: string
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  onMobileMenuClick?: () => void
  initialLoadAnimation?: boolean
  mobileToggleLabel?: React.ReactNode
  mobileToggleOpenLabel?: React.ReactNode
}

export function PillNav({
  logoSrc,
  logoAlt = "Logo",
  logoHref = "/",
  items,
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "#000000",
  pillColor = "#ffffff",
  hoveredPillTextColor = "#ffffff",
  pillTextColor,
  onMobileMenuClick,
  initialLoadAnimation = true,
  mobileToggleLabel,
  mobileToggleOpenLabel,
}: PillNavProps) {
  const resolvedPillTextColor = pillTextColor ?? baseColor

  const cssVars: React.CSSProperties = {
    ["--base" as any]: baseColor,
    ["--pill-bg" as any]: pillColor,
    ["--hover-text" as any]: hoveredPillTextColor,
    ["--pill-text" as any]: resolvedPillTextColor,
    ["--nav-h" as any]: "42px",
    ["--logo" as any]: "36px",
    ["--pill-pad-x" as any]: "18px",
    ["--pill-gap" as any]: "3px",
  }

  const sanitized = (activeHref || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'root'
  const menuId = `mobile-menu-${sanitized}`

  // Desktop-only: merge separate language pills (中文/English) into one dropdown item
  const desktopItems = (() => {
    const arr = [...items]
    const langIdxs: number[] = []
    let zhHref: string | undefined
    let enHref: string | undefined
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i] as any
      const label = it?.label
      if (typeof label === 'string' && (label === '中文' || label === 'English' || label === 'ENGLISH')) {
        langIdxs.push(i)
        if (label === '中文') zhHref = it.href
        else enHref = it.href
      }
    }
    if (!langIdxs.length) return arr
    const insertAt = langIdxs[0]
    for (let j = langIdxs.length - 1; j >= 0; j--) arr.splice(langIdxs[j], 1)
    const currentIsZh = (activeHref || '').startsWith('/zh')
    const label = currentIsZh ? 'English' : '中文'
    const children: { label: React.ReactNode; href: string; ariaLabel?: string }[] = []
    if (zhHref) children.push({ label: '中文', href: zhHref })
    if (enHref) children.push({ label: 'English', href: enHref })
    const combined: import('./pill/types').PillNavItem = { label, children }
    arr.splice(insertAt, 0, combined)
    return arr
  })()

  // Mobile: render the user custom (avatar dropdown) next to the logo if present
  const mobileUserCustom = items.find((i) => i.shape === 'circle' && i.custom)?.custom

  return (
    <div className={cn("w-full", className)}>
      <nav className="relative w-full md:w-full flex items-center justify-between md:justify-center gap-2 md:gap-4 box-border" aria-label="Primary" style={cssVars}>
        <div className="hidden md:flex items-center" style={{ gap: 'var(--pill-gap)' as any }}>
          <LogoButton logoSrc={logoSrc} logoAlt={logoAlt} logoHref={logoHref} ease={ease} />
          <div className="md:[--nav-h:52px] md:[--logo:44px] md:[--pill-pad-x:22px] md:[--pill-gap:4px]">
            <DesktopMenu items={desktopItems} activeHref={activeHref} ease={ease} initialLoadAnimation={initialLoadAnimation} />
          </div>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <LogoButton logoSrc={logoSrc} logoAlt={logoAlt} logoHref={logoHref} ease={ease} />
          {mobileUserCustom ? (
            <span className="inline-flex items-center" style={{ height: 'var(--nav-h)' }}>
              {mobileUserCustom}
            </span>
          ) : null}
        </div>
        <MobileMenu
          items={items}
          activeHref={activeHref}
          ease={ease}
          onToggle={onMobileMenuClick}
          menuId={menuId}
          toggleLabel={mobileToggleLabel}
          toggleOpenLabel={mobileToggleOpenLabel}
        />
      </nav>
    </div>
  )
}
