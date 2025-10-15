"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import type { PillNavItem } from "./types"

type Props = {
  items: PillNavItem[]
  activeHref?: string
  ease?: string
  onToggle?: () => void
  menuId?: string
  toggleLabel?: React.ReactNode
  toggleOpenLabel?: React.ReactNode
}

const isExternalLink = (href: string) =>
  href.startsWith("http://") ||
  href.startsWith("https://") ||
  href.startsWith("//") ||
  href.startsWith("mailto:") ||
  href.startsWith("tel:") ||
  href.startsWith("#")

const isRouterLink = (href: string) => href && !isExternalLink(href)
const hrefMatches = (base?: string, current?: string) => !!base && !!current && (current === base || current.startsWith(base + "/"))

export function MobileMenu({ items, activeHref, ease = "power3.easeOut", onToggle, menuId: providedMenuId, toggleLabel, toggleOpenLabel }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const menuId = providedMenuId || 'mobile-menu-root'

  const toggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    onToggle?.()
  }

  // Animate menu/overlay visibility and lock page scroll while open
  useEffect(() => {
    const menu = menuRef.current
    const ov = overlayRef.current
    if (!menu || !ov) return
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (isOpen) {
      gsap.set([menu, ov], { visibility: 'visible', pointerEvents: 'auto' })
      if (!reduce) {
        gsap.fromTo(menu, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.25, ease })
        gsap.fromTo(ov, { opacity: 0 }, { opacity: 1, duration: 0.2, ease })
      } else {
        gsap.set(menu, { opacity: 1, y: 0 })
        gsap.set(ov, { opacity: 1 })
      }
      document.body.classList.add('overflow-hidden')
      // focus management: capture previous focus and move focus to first item
      previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null
      const firstFocusable = menu.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'
      )
      firstFocusable?.focus()
    } else {
      const onDone = () => { gsap.set([menu, ov], { visibility: 'hidden', pointerEvents: 'none' }) }
      if (!reduce) {
        gsap.to(menu, { opacity: 0, y: 10, duration: 0.2, ease, onComplete: onDone })
        gsap.to(ov, { opacity: 0, duration: 0.15, ease })
      } else {
        gsap.set(menu, { opacity: 0, y: 10 })
        gsap.set(ov, { opacity: 0 })
        onDone()
      }
      document.body.classList.remove('overflow-hidden')
      // restore focus to hamburger or previous focus
      const hb = hamburgerRef.current
      if (hb) hb.focus()
      else previousFocusRef.current?.focus()
    }
  }, [isOpen, ease])

  // No hamburger icon animation; button shows text label instead.

  // Focus trap and keyboard close (Esc)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setIsOpen(false)
        return
      }
      if (e.key === 'Tab') {
        const menu = menuRef.current
        if (!menu) return
        const focusables = Array.from(
          menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea')
        ).filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1)
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        const isShift = e.shiftKey
        if (!isShift && active === last) {
          e.preventDefault()
          first.focus()
        } else if (isShift && active === first) {
          e.preventDefault()
          last.focus()
        }
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [isOpen])

  // Close menu on viewport >= md (768px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsOpen(false)
    }
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange)
      else mq.removeListener(onChange)
    }
  }, [])

  // Safety: ensure body scroll restored on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [])

  const defaultStyle: React.CSSProperties = { background: "var(--pill-bg, #fff)", color: "var(--pill-text, #000)" }
  const linkClasses = "inline-flex text-left py-2 px-3 text-[15px] font-medium rounded-[10px] whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
  const childLinkClasses = "inline-flex text-left py-1.5 px-3 text-[14px] font-medium rounded-[10px] whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"

  const hoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "var(--base)"; e.currentTarget.style.color = "var(--hover-text, #fff)" }
  const hoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.background = "var(--pill-bg, #fff)"; e.currentTarget.style.color = "var(--pill-text, #000)" }

  // Partition items for mobile order: quick (languages + sign in) then rest
  const isLanguageItem = (it: PillNavItem) => typeof it.label === 'string' && (it.label === '中文' || it.label === 'English')
  const isSignInItem = (it: PillNavItem) => typeof it.href === 'string' && it.href.includes('/auth/signin')
  const quick: PillNavItem[] = items.filter((it) => isLanguageItem(it) || isSignInItem(it))
  const rest: PillNavItem[] = items.filter((it) => !quick.includes(it))
  const ordered: PillNavItem[] = [...quick, ...rest]

  return (
    <>
      <button
        ref={hamburgerRef}
        onClick={toggle}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="dialog"
        className="md:hidden rounded-full border-0 inline-flex items-center justify-center cursor-pointer relative ml-2 px-3 font-semibold text-[14px]"
        style={{ height: "var(--nav-h)", background: "var(--base, #000)", color: "var(--pill-bg, #fff)" }}
      >
        <span>{isOpen ? (toggleOpenLabel ?? 'Close') : (toggleLabel ?? 'Menu')}</span>
      </button>

      {/* Overlay for outside tap */}
      <div
        ref={overlayRef}
        className="md:hidden fixed inset-0 z-[997] bg-black/40"
        style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <div
        ref={menuRef}
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="md:hidden absolute left-0 right-0 top-[calc(100%+8px)] rounded-[27px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-[998] origin-top max-h-[75vh] overflow-y-auto overscroll-contain p-2"
        style={{ background: "var(--base, #f0f0f0)", visibility: "hidden", opacity: 0, pointerEvents: 'none' }}
      >
        <ul className="list-none m-0 p-0 flex flex-col gap-1.5 items-start">
          {([...ordered]).map((item, i) => (
            <li key={(item.href ?? "custom-") + i} className="w-auto self-start">
              {item.custom && !item.href ? (
                <div className={linkClasses} style={defaultStyle}>{item.custom}</div>
              ) : item.children && item.children.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 text-[13px] font-semibold text-white/90">{item.label}</div>
                  {item.children.map((child, ci) => (
                    isRouterLink(child.href) ? (
                      <Link
                        key={(child.href ?? "child-") + ci}
                        href={child.href}
                        className={childLinkClasses}
                        style={defaultStyle}
                        onMouseEnter={hoverIn}
                        onMouseLeave={hoverOut}
                        onClick={() => setIsOpen(false)}
                        aria-current={hrefMatches(child.href, activeHref) ? 'page' : undefined}
                      >
                        {child.label}
                      </Link>
                    ) : (
                      <a
                        key={(child.href ?? "child-") + ci}
                        href={child.href}
                        className={childLinkClasses}
                        style={defaultStyle}
                        onMouseEnter={hoverIn}
                        onMouseLeave={hoverOut}
                        onClick={() => setIsOpen(false)}
                        aria-current={hrefMatches(child.href, activeHref) ? 'page' : undefined}
                      >
                        {child.label}
                      </a>
                    )
                  ))}
                </>
              ) : isRouterLink(item.href || "") ? (
                <Link
                  href={item.href as string}
                  className={linkClasses}
                  style={defaultStyle}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                  onClick={() => setIsOpen(false)}
                  aria-current={hrefMatches(item.href, activeHref) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  href={item.href}
                  className={linkClasses}
                  style={defaultStyle}
                  onMouseEnter={hoverIn}
                  onMouseLeave={hoverOut}
                  onClick={() => setIsOpen(false)}
                  aria-current={hrefMatches(item.href, activeHref) ? 'page' : undefined}
                >
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
