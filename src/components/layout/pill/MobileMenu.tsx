"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import type { PillNavItem } from "./types"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useLocale } from "@/contexts/LocaleContext"
import { LanguageRow, MainList, AccountSection } from "./mobile/Sections"

type Props = {
  items: PillNavItem[]
  activeHref?: string
  ease?: string
  onToggle?: () => void
  menuId?: string
  toggleLabel?: React.ReactNode
  toggleOpenLabel?: React.ReactNode
}

// Link helpers moved to ./mobile/utils

export function MobileMenu({ items, activeHref, ease = "power3.easeOut", onToggle, menuId: providedMenuId, toggleLabel, toggleOpenLabel }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { locale } = useLocale()

  const toggleBtnRef = useRef<HTMLButtonElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const preLayersRef = useRef<HTMLDivElement | null>(null)
  const preLayerElsRef = useRef<HTMLDivElement[]>([])
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const menuId = providedMenuId || 'mobile-menu-root'

  // Toggle text wrapper (animated vertical slide)
  const textInnerRef = useRef<HTMLSpanElement | null>(null)

  // Timelines
  const openTlRef = useRef<gsap.core.Timeline | null>(null)
  const closeTweenRef = useRef<gsap.core.Tween | null>(null)
  const textTweenRef = useRef<gsap.core.Tween | null>(null)

  // Initial setup for prelayers and text
  useLayoutEffect(() => {
    const panel = panelRef.current
    const preContainer = preLayersRef.current
    const textInner = textInnerRef.current
    if (!panel || !textInner) return

    let preLayers: HTMLDivElement[] = []
    if (preContainer) {
      preLayers = Array.from(preContainer.querySelectorAll<HTMLDivElement>('.sm-prelayer'))
    }
    preLayerElsRef.current = preLayers

    // Offscreen to the right
    gsap.set([panel, ...preLayers], { xPercent: 100 })
    // Text stack initial position
    gsap.set(textInner, { yPercent: 0 })
  }, [])

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current
    const overlay = overlayRef.current
    const layers = preLayerElsRef.current
    if (!panel || !overlay) return null

    openTlRef.current?.kill()
    closeTweenRef.current?.kill()
    textTweenRef.current?.kill()

    const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-item'))
    const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }))
    const panelStart = Number(gsap.getProperty(panel, 'xPercent'))

    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const tl = gsap.timeline({ paused: true })

    // Overlay fade in
    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease }, 0)

    // Layers slide
    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: reduce ? 0 : 0.5, ease: 'power4.out' }, i * 0.07)
    })

    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0)
    const panelDur = reduce ? 0 : 0.6

    // Panel slide
    tl.fromTo(panel, { xPercent: panelStart }, { xPercent: 0, duration: panelDur, ease: 'power4.out' }, panelInsertTime)

    // Items entrance
    if (itemEls.length) {
      if (!reduce) gsap.set(itemEls, { yPercent: 140, rotate: 10 })
      const itemsStart = panelInsertTime + (reduce ? 0 : panelDur * 0.2)
      tl.to(itemEls, {
        yPercent: 0,
        rotate: 0,
        duration: reduce ? 0 : 0.8,
        ease: 'power4.out',
        stagger: reduce ? 0 : { each: 0.08, from: 'start' },
      }, itemsStart)
    }

    openTlRef.current = tl
    return tl
  }, [ease])

  const animateText = useCallback((opening: boolean) => {
    const inner = textInnerRef.current
    if (!inner) return
    textTweenRef.current?.kill()
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const target = opening ? -50 : 0 // 2 lines, 0% is first line, -50% shows second
    textTweenRef.current = gsap.to(inner, { yPercent: target, duration: 0.45, ease: 'power3.out' })
  }, [])

  // Handle open/close: overlay/panel/layers/items + body lock + focus
  useEffect(() => {
    const overlay = overlayRef.current
    const panel = panelRef.current
    if (!overlay || !panel) return
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (isOpen) {
      // visibility & pointer events (prelayers stay pointer-events: none)
      gsap.set([overlay, panel], { visibility: 'visible', pointerEvents: 'auto' })
      if (preLayersRef.current) gsap.set(preLayersRef.current, { visibility: 'visible', pointerEvents: 'none' })

      // scroll lock
      document.body.classList.add('overflow-hidden')

      // focus restore target
      previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null

      // play open timeline
      const tl = buildOpenTimeline()
      tl?.play(0)

      // toggle text animation
      animateText(true)

      // focus first focusable
      const firstFocusable = panel.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea')
      firstFocusable?.focus()
    } else {
      // close timeline to slide out
      const layers = preLayerElsRef.current
      const all = [...layers, panel]
      openTlRef.current?.kill()

      const off = 100
      closeTweenRef.current?.kill()
      closeTweenRef.current = gsap.to(all, {
        xPercent: off,
        duration: reduce ? 0 : 0.32,
        ease: 'power3.in',
        overwrite: 'auto',
        onComplete: () => {
          // hide and reset
          const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-item'))
          if (!reduce) gsap.set(itemEls, { yPercent: 140, rotate: 10 })
          gsap.set([overlay, panel], { visibility: 'hidden', pointerEvents: 'none' })
          if (preLayersRef.current) gsap.set(preLayersRef.current, { visibility: 'hidden', pointerEvents: 'none' })
          gsap.set(overlay, { opacity: 0 })
          
        }
      })

      // release scroll
      document.body.classList.remove('overflow-hidden')

      // toggle text back
      animateText(false)

      // focus restoration
      const hb = toggleBtnRef.current
      if (hb) hb.focus()
      else previousFocusRef.current?.focus()
    }
  }, [isOpen, buildOpenTimeline, animateText])

  // Keyboard: ESC close + focus trap within panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation(); setIsOpen(false); return
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current
        if (!panel) return
        const focusables = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea')).filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1)
        if (!focusables.length) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
        else if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [isOpen])

  // Close menu on viewport >= md (768px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setIsOpen(false) }
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => { if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange); else mq.removeListener(onChange) }
  }, [])

  // Safety: ensure body scroll restored on unmount
  useEffect(() => () => { document.body.classList.remove('overflow-hidden') }, [])

  const toggle = () => { const next = !isOpen; setIsOpen(next); onToggle?.() }

  // Partition items for mobile: languages row at top; main items; account group at bottom.
  const isLanguageItem = (it: PillNavItem) => typeof it.label === 'string' && (it.label === '中文' || it.label === 'English')
  const isSignInItem = (it: PillNavItem) => typeof it.href === 'string' && it.href.includes('/auth/signin')

  const langItems = items.filter(isLanguageItem)
  const signInItem = items.find(isSignInItem)
  const hasUserCustom = items.some((it) => !!it.custom)

  // Keep Admin/Orders in the main list for parity with desktop; exclude only language, sign-in, custom avatar.
  const mainItems: PillNavItem[] = items.filter((it) => !isLanguageItem(it) && !isSignInItem(it) && !it.custom)

  //

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } finally {
      setIsOpen(false)
      router.push(`/${locale}`)
      router.refresh()
    }
  }

  return (
    <>
      {/* Toggle */}
      <button
        ref={toggleBtnRef}
        onClick={toggle}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="dialog"
        className="md:hidden rounded-full border-0 inline-flex items-center justify-center cursor-pointer relative ml-2 px-3 font-semibold text-[14px] gap-2"
        style={{ height: "var(--nav-h)", background: "var(--base, #000)", color: "var(--pill-bg, #fff)" }}
      >
        {/* Text cycler */}
        <span className="relative inline-block h-[1em] overflow-hidden" style={{ width: 'auto', minWidth: 'auto' }}>
          <span ref={textInnerRef} className="flex flex-col leading-none">
            <span className="leading-none">{toggleLabel ?? 'Menu'}</span>
            <span className="leading-none">{toggleOpenLabel ?? 'Close'}</span>
          </span>
        </span>
      </button>

      {/* Overlay */}
      <div
        ref={overlayRef}
        className="md:hidden fixed inset-0 z-[997] bg-black/40"
        style={{ visibility: 'hidden', opacity: 0, pointerEvents: 'none' }}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      {/* Prelayers (behind panel) */}
      <div
        ref={preLayersRef}
        className="md:hidden fixed inset-y-0 right-0 z-[998] pointer-events-none"
        style={{ visibility: 'hidden', opacity: 1, width: 'min(50vw, 420px)' }}
        aria-hidden="true"
      >
        <div className="sm-prelayer absolute inset-y-0 right-0 w-full" style={{ background: 'var(--base, #000)', opacity: 0.10 }} />
        <div className="sm-prelayer absolute inset-y-0 right-0 w-full" style={{ background: 'var(--base, #000)', opacity: 0.14 }} />
        <div className="sm-prelayer absolute inset-y-0 right-0 w-full" style={{ background: 'var(--base, #000)', opacity: 0.18 }} />
      </div>

      {/* Side panel */}
      <aside
        ref={panelRef}
        id={menuId}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="md:hidden fixed inset-y-0 right-0 z-[999] overflow-y-auto overscroll-contain"
        style={{ visibility: 'hidden', pointerEvents: 'none', width: 'min(50vw, 420px)' }}
      >
        <div className="relative h-full w-full bg-white/95 backdrop-blur-md px-5 py-6 flex flex-col gap-4">
          {/* In-panel close button */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsOpen(false)}
            className="absolute right-3 top-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/10 text-black hover:bg-black/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
          <nav className="flex-1 flex flex-col gap-2" aria-label="Mobile">
            {/* Languages row at top */}
            <LanguageRow langItems={langItems} onClose={() => setIsOpen(false)} />

            {/* Main navigation items */}
            <MainList items={mainItems} activeHref={activeHref} onClose={() => setIsOpen(false)} />

            {/* Account group at bottom (hidden when avatar/custom is present). Keep account-only actions. */}
            {!hasUserCustom && (
              <AccountSection
                signInItem={signInItem}
                hasUserCustom={hasUserCustom}
                onClose={() => setIsOpen(false)}
                onSignOut={handleSignOut}
              />
            )}
          </nav>
        </div>
      </aside>
    </>
  )
}
