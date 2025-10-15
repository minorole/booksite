"use client"

import { cn } from "@/lib/utils"
import { DesktopMenu } from "./pill/DesktopMenu"
import { MobileMenu } from "./pill/MobileMenu"
import { LogoButton } from "./pill/LogoButton"
export type { PillNavItem } from "./pill/types"

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

  return (
    <div className={cn("w-full", className)}>
      <nav className="relative w-full md:w-full flex items-center justify-between md:justify-center gap-2 md:gap-4 box-border" aria-label="Primary" style={cssVars}>
        <LogoButton logoSrc={logoSrc} logoAlt={logoAlt} logoHref={logoHref} ease={ease} />
        <DesktopMenu items={items} activeHref={activeHref} ease={ease} initialLoadAnimation={initialLoadAnimation} />
        <MobileMenu items={items} ease={ease} onToggle={onMobileMenuClick} />
      </nav>
    </div>
  )
}
