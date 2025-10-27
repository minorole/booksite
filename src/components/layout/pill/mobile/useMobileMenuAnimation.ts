"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'

export function useMobileMenuAnimation(opts?: { ease?: string }) {
  const ease = opts?.ease || 'power3.easeOut'

  const [isOpen, setIsOpen] = useState(false)

  const toggleBtnRef = useRef<HTMLButtonElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const preLayersRef = useRef<HTMLDivElement | null>(null)
  const preLayerElsRef = useRef<HTMLDivElement[]>([])
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const openTlRef = useRef<gsap.core.Timeline | null>(null)
  const closeTweenRef = useRef<gsap.core.Timeline | gsap.core.Tween | null>(null)

  // Setup for prelayers and text when mounting open state
  useLayoutEffect(() => {
    if (!isOpen) return
    const panel = panelRef.current
    const preContainer = preLayersRef.current
    if (!panel) return

    let preLayers: HTMLDivElement[] = []
    if (preContainer) {
      preLayers = Array.from(preContainer.querySelectorAll<HTMLDivElement>('.sm-prelayer'))
    }
    preLayerElsRef.current = preLayers

    gsap.set([panel, ...preLayers], { xPercent: 100 })
    // no-op: text animation removed
  }, [isOpen])

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current
    const overlay = overlayRef.current
    const layers = preLayerElsRef.current
    if (!panel || !overlay) return null

    openTlRef.current?.kill()
    closeTweenRef.current?.kill()

    const itemEls = Array.from(panel.querySelectorAll<HTMLElement>('.sm-item'))
    const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }))
    const panelStart = Number(gsap.getProperty(panel, 'xPercent'))

    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const tl = gsap.timeline({ paused: true })
    tl.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2, ease }, 0)
    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: reduce ? 0 : 0.5, ease: 'power4.out' }, i * 0.07)
    })
    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0)
    const panelDur = reduce ? 0 : 0.6
    tl.fromTo(panel, { xPercent: panelStart }, { xPercent: 0, duration: panelDur, ease: 'power4.out' }, panelInsertTime)

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

  const animateText = useCallback((_opening: boolean) => {
    // text animation removed for icon-only toggle
  }, [])

  // Drive open/close
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('overflow-hidden')
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null

    const tl = buildOpenTimeline()
    tl?.play(0)
    animateText(true)

    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen, buildOpenTimeline, animateText])

  // Close on >= md
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => { if (e.matches) setIsOpen(false) }
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange)
    else mq.addListener(onChange)
    return () => { if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange); else mq.removeListener(onChange) }
  }, [])

  useEffect(() => () => { document.body.classList.remove('overflow-hidden') }, [])

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

  const requestOpen = () => setIsOpen(true)
  const handleOpenChange = (next: boolean) => { if (next) requestOpen(); else requestClose() }
  const toggle = () => { const next = !isOpen; if (next) requestOpen(); else requestClose() }

  return {
    isOpen,
    setIsOpen,
    requestOpen,
    requestClose,
    handleOpenChange,
    toggle,
    refs: { toggleBtnRef, overlayRef, panelRef, preLayersRef },
  }
}
