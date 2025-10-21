"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { gsap } from "gsap"
import * as DialogPrimitive from "@radix-ui/react-dialog"
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
  const closeTweenRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null)
  const textTweenRef = useRef<gsap.core.Tween | null>(null)

  // Initial setup for prelayers and text when mounting open state
  useLayoutEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    const preContainer = preLayersRef.current
    const textInner = textInnerRef.current
    if (!panel || !textInner) return

    let preLayers: HTMLDivElement[] = []
    if (preContainer) {
      preLayers = Array.from(preContainer.querySelectorAll<HTMLDivElement>('.sm-prelayer'))
    }
    preLayerElsRef.current = preLayers

    // Offscreen to the right before opening animation
    gsap.set([panel, ...preLayers], { xPercent: 100 })
    // Text stack initial position
    gsap.set(textInner, { yPercent: 0 })
  }, [isOpen])

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

  // Drive open/close via Radix: animate in/out and manage scroll/focus
  useEffect(() => {
    if (!isOpen) return
    // body scroll lock while open
    document.body.classList.add('overflow-hidden')
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null

    // Build and play open animation
    const tl = buildOpenTimeline()
    tl?.play(0)
    animateText(true)

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen, buildOpenTimeline, animateText])

  // Radix handles Escape and focus trap; no custom keydown needed

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

  // Centralized open/close so we animate out before unmounting Dialog
  const requestClose = () => {
    const panel = panelRef.current
    const overlay = overlayRef.current
    if (!panel || !overlay) { setIsOpen(false); return }
    const layers = preLayerElsRef.current
    const all = [...layers, panel]
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    openTlRef.current?.kill()
    animateText(false)
    closeTweenRef.current?.kill()
    closeTweenRef.current = gsap.timeline({
      onComplete: () => {
        setIsOpen(false)
        const hb = toggleBtnRef.current
        if (hb) hb.focus(); else previousFocusRef.current?.focus()
      },
    })
    .to(all, { xPercent: 100, duration: reduce ? 0 : 0.32, ease: 'power3.in', overwrite: 'auto' }, 0)
    .to(overlay, { opacity: 0, duration: reduce ? 0 : 0.22, ease: 'power3.in' }, 0)
  }

  const requestOpen = () => {
    setIsOpen(true)
  }

  const handleOpenChange = (next: boolean) => {
    if (next) requestOpen()
    else requestClose()
  }

  const toggle = () => {
    const next = !isOpen
    if (next) requestOpen()
    else requestClose()
    onToggle?.()
  }

  // Partition items for mobile: languages row at top; main items; account group at bottom.
  const isLanguageItem = (it: PillNavItem) => typeof it.label === 'string' && (it.label === '中文' || it.label === 'English' || it.label === 'ENGLISH')
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

      <DialogPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
        <DialogPrimitive.Portal>
          {/* Overlay */}
          <DialogPrimitive.Overlay
            ref={overlayRef}
            className="md:hidden fixed inset-0 z-[997] bg-black/40"
            // opacity animated by GSAP
            style={{ opacity: 0 }}
          />

          {/* Prelayers (behind panel) */}
          <div
            ref={preLayersRef}
            className="md:hidden fixed inset-y-0 right-0 z-[998] pointer-events-none"
            style={{ opacity: 1, width: 'min(50vw, 420px)' }}
            aria-hidden="true"
          >
            <div className="sm-prelayer absolute inset-y-0 right-0 w-full" style={{ background: 'var(--base, #000)', opacity: 0.10 }} />
            <div className="sm-prelayer absolute inset-y-0 right-0 w-full" style={{ background: 'var(--base, #000)', opacity: 0.14 }} />
            <div className="sm-prelayer absolute inset-y-0 right-0 w-full" style={{ background: 'var(--base, #000)', opacity: 0.18 }} />
          </div>

          {/* Side panel */}
          <DialogPrimitive.Content
            ref={panelRef}
            id={menuId}
            aria-label="Mobile navigation"
            className="md:hidden fixed inset-y-0 right-0 z-[999] overflow-y-auto overscroll-contain"
            style={{ width: 'min(50vw, 420px)' }}
          >
            <div className="relative h-full w-full bg-white/95 backdrop-blur-md px-5 py-6 flex flex-col gap-4">
              {/* In-panel close button */}
              <button
                type="button"
                aria-label="Close menu"
                onClick={requestClose}
                className="absolute right-3 top-3 inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/10 text-black hover:bg-black/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              >
                <span aria-hidden className="text-xl leading-none">×</span>
              </button>
              <nav className="flex-1 flex flex-col gap-2" aria-label="Mobile">
                {/* Languages row at top */}
                <LanguageRow langItems={langItems} onClose={requestClose} />

                {/* Main navigation items */}
                <MainList items={mainItems} activeHref={activeHref} onClose={requestClose} />

                {/* Account group at bottom (hidden when avatar/custom is present). Keep account-only actions. */}
                {!hasUserCustom && (
                  <AccountSection
                    signInItem={signInItem}
                    hasUserCustom={hasUserCustom}
                    onClose={requestClose}
                    onSignOut={handleSignOut}
                  />
                )}
              </nav>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
