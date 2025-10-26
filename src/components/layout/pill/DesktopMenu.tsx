"use client"

import { useEffect, useRef, useState } from "react"
import type { PillNavItem } from "./types"
import { DesktopPillItem } from "./DesktopPillItem"

type Props = {
  items: PillNavItem[]
  activeHref?: string
  ease?: string
  initialLoadAnimation?: boolean
}

export function DesktopMenu({ items, activeHref, ease = "power3.easeOut", initialLoadAnimation = true }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const [scale, setScale] = useState(1)

  // Remove width-reveal animation and any overflowX auto toggling.

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      const root = rootRef.current
      if (!root) return
      if (e.target instanceof Node && !root.contains(e.target)) setOpenIndex(null)
    }
    document.addEventListener("click", handleDocClick)
    return () => document.removeEventListener("click", handleDocClick)
  }, [])

  // Fit the pill cluster within the available width without scroll (no animations).
  useEffect(() => {
    const container = containerRef.current
    const list = listRef.current
    if (!container || !list) return
    const compute = () => {
      const containerW = container.clientWidth || 0
      const listW = list.scrollWidth || 0
      const next = listW > 0 ? Math.min(1, containerW / listW) : 1
      setScale(Number.isFinite(next) ? next : 1)
    }
    compute()
    const ro = new ResizeObserver(() => compute())
    ro.observe(container)
    ro.observe(list)
    window.addEventListener("resize", compute)
    return () => {
      ro.disconnect()
      window.removeEventListener("resize", compute)
    }
  }, [items])

  return (
    <div
      ref={(el) => { containerRef.current = el; rootRef.current = el }}
      className="hidden md:flex items-center rounded-full"
      style={{
        height: "var(--nav-h)",
        background: "var(--base, #000)",
        minWidth: 0,
        maxWidth: "calc(100% - (var(--nav-h) + 8px) * 2)",
        paddingBottom: "8px",
      }}
    >
      <ul
        role="menubar"
        ref={listRef}
        className="list-none flex items-stretch m-0 p-[3px] h-full mx-auto"
        style={{
          gap: "var(--pill-gap)",
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: "center",
        }}
      >
        {items.map((item, i) => (
          <DesktopPillItem
            key={(item.href ?? item.ariaLabel ?? "item-") + i}
            item={item}
            index={i}
            activeHref={activeHref}
            ease={ease}
            isOpen={openIndex === i}
            onOpen={() => setOpenIndex(i)}
            onClose={() => setOpenIndex((v) => (v === i ? null : v))}
          />
        ))}
      </ul>
    </div>
  )
}
