"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { gsap } from "gsap"
import type { PillNavItem } from "./types"
import { Bilingual } from "@/components/common/bilingual"

type Props = {
  items: PillNavItem[]
  ease?: string
  onToggle?: () => void
}

const isExternalLink = (href: string) =>
  href.startsWith("http://") ||
  href.startsWith("https://") ||
  href.startsWith("//") ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:") ||
  href.startsWith("#")

const isRouterLink = (href: string) => href && !isExternalLink(href)

export function MobileMenu({ items, ease = "power3.easeOut", onToggle }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [showMore, setShowMore] = useState(false)

  const toggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    if (!newState) setShowMore(false)
    const hamburger = hamburgerRef.current
    const menu = menuRef.current
    if (hamburger) {
      const lines = hamburger.querySelectorAll(".hamburger-line")
      if (newState) {
        gsap.to(lines[0], { rotation: 45, y: 3, duration: 0.3, ease })
        gsap.to(lines[1], { rotation: -45, y: -3, duration: 0.3, ease })
      } else {
        gsap.to(lines[0], { rotation: 0, y: 0, duration: 0.3, ease })
        gsap.to(lines[1], { rotation: 0, y: 0, duration: 0.3, ease })
      }
    }
    if (menu) {
      if (newState) {
        gsap.set(menu, { visibility: "visible" })
        gsap.fromTo(menu, { opacity: 0, y: 10, scaleY: 1 }, { opacity: 1, y: 0, scaleY: 1, duration: 0.3, ease, transformOrigin: "top center" })
      } else {
        gsap.to(menu, { opacity: 0, y: 10, scaleY: 1, duration: 0.2, ease, transformOrigin: "top center", onComplete: () => { gsap.set(menu, { visibility: "hidden" }) } })
      }
    }
    onToggle?.()
  }

  const defaultStyle: React.CSSProperties = { background: "var(--pill-bg, #fff)", color: "var(--pill-text, #fff)" }
  const linkClasses = "block py-3 px-4 text-[16px] font-medium rounded-[50px] transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"

  const hoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "var(--base)"; e.currentTarget.style.color = "var(--hover-text, #fff)" }
  const hoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "var(--pill-bg, #fff)"; e.currentTarget.style.color = "var(--pill-text, #fff)" }

  // Partition items for mobile: quick (languages + sign in) vs rest
  const isLanguageItem = (it: PillNavItem) => typeof it.label === 'string' && (it.label === '中文' || it.label === 'English')
  const isSignInItem = (it: PillNavItem) => typeof it.href === 'string' && it.href.includes('/auth/signin')
  const quick: PillNavItem[] = items.filter((it) => isLanguageItem(it) || isSignInItem(it))
  const rest: PillNavItem[] = items.filter((it) => !quick.includes(it))

  return (
    <>
      <button
        ref={hamburgerRef}
        onClick={toggle}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        className="md:hidden rounded-full border-0 flex flex-col items-center justify-center gap-1 cursor-pointer p-0 relative ml-2"
        style={{ width: "var(--nav-h)", height: "var(--nav-h)", background: "var(--base, #000)" }}
      >
        <span className="hamburger-line w-4 h-0.5 rounded origin-center transition-all duration-[10ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]" style={{ background: "var(--pill-bg, #fff)" }} />
        <span className="hamburger-line w-4 h-0.5 rounded origin-center transition-all duration-[10ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]" style={{ background: "var(--pill-bg, #fff)" }} />
      </button>

      <div ref={menuRef} className="md:hidden absolute left-0 right-0 rounded-[27px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[998] origin-top mt-3" style={{ background: "var(--base, #f0f0f0)" }}>
        <ul className="list-none m-0 p-[3px] flex flex-col gap-[3px]">
          {/* Quick section: languages + sign in */}
          {quick.map((item, i) => (
            <li key={(item.href ?? "custom-") + "q" + i}>
              {item.custom && !item.href ? (
                <div className={linkClasses} style={defaultStyle}>{item.custom}</div>
              ) : item.children && item.children.length > 0 ? (
                <>
                  <div className={linkClasses} style={defaultStyle}>{item.label}</div>
                  {item.children.map((child, ci) => {
                    return isRouterLink(child.href) ? (
                      <Link key={(child.href ?? "child-") + ci} href={child.href} className={linkClasses} style={defaultStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut} onClick={() => setIsOpen(false)}>
                        {child.label}
                      </Link>
                    ) : (
                      <a key={(child.href ?? "child-") + ci} href={child.href} className={linkClasses} style={defaultStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut} onClick={() => setIsOpen(false)}>
                        {child.label}
                      </a>
                    )
                  })}
                </>
              ) : isRouterLink(item.href || "") ? (
                <Link href={item.href as string} className={linkClasses} style={defaultStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut} onClick={() => setIsOpen(false)}>
                  {item.label}
                </Link>
              ) : (
                <a href={item.href} className={linkClasses} style={defaultStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut} onClick={() => setIsOpen(false)}>
                  {item.label}
                </a>
              )}
            </li>
          ))}

          {/* Toggle to show the remaining menu items */}
          {rest.length > 0 && (
            <li key="browse-toggle">
              <button
                type="button"
                className={linkClasses}
                style={defaultStyle}
                onClick={() => setShowMore((v) => !v)}
              >
                {showMore ? (
                  <Bilingual cnText="收起" enText="Hide" />
                ) : (
                  <Bilingual cnText="展开更多" enText="Browse more" />
                )}
              </button>
            </li>
          )}

          {/* Rest of the items, conditionally shown */}
          {showMore && rest.map((item, i) => (
            <li key={(item.href ?? "custom-") + "r" + i}>
              {item.custom && !item.href ? (
                <div className={linkClasses} style={defaultStyle}>{item.custom}</div>
              ) : item.children && item.children.length > 0 ? (
                <>
                  <div className={linkClasses} style={defaultStyle}>{item.label}</div>
                  {item.children.map((child, ci) => (
                    isRouterLink(child.href) ? (
                      <Link key={(child.href ?? "child-") + ci} href={child.href} className={linkClasses} style={defaultStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut} onClick={() => setIsOpen(false)}>
                        {child.label}
                      </Link>
                    ) : (
                      <a key={(child.href ?? "child-") + ci} href={child.href} className={linkClasses} style={defaultStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut} onClick={() => setIsOpen(false)}>
                        {child.label}
                      </a>
                    )
                  ))}
                </>
              ) : isRouterLink(item.href || "") ? (
                <Link href={item.href as string} className={linkClasses} style={defaultStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut} onClick={() => setIsOpen(false)}>
                  {item.label}
                </Link>
              ) : (
                <a href={item.href} className={linkClasses} style={defaultStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut} onClick={() => setIsOpen(false)}>
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
