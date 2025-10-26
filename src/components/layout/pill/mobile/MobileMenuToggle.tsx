"use client"

import * as React from 'react'

export type MobileMenuToggleProps = {
  isOpen: boolean
  onClick: () => void
  menuId: string
  toggleLabel?: React.ReactNode
  toggleOpenLabel?: React.ReactNode
  textInnerRef: React.RefObject<HTMLSpanElement>
}

export const MobileMenuToggle = React.forwardRef<HTMLButtonElement, MobileMenuToggleProps>(
  function MobileMenuToggle({ isOpen, onClick, menuId, toggleLabel, toggleOpenLabel, textInnerRef }, ref) {
    return (
      <button
        ref={ref}
        onClick={onClick}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="dialog"
        className="md:hidden rounded-full border-0 inline-flex items-center justify-center cursor-pointer relative ml-2 px-3 font-semibold text-[14px] gap-2"
        style={{ height: "var(--nav-h)", background: "var(--base, #000)", color: "var(--pill-bg, #fff)" }}
      >
        <span className="relative inline-block h-[1em] overflow-hidden" style={{ width: 'auto', minWidth: 'auto' }}>
          <span ref={textInnerRef} className="flex flex-col leading-none">
            <span className="leading-none">{toggleLabel ?? 'Menu'}</span>
            <span className="leading-none">{toggleOpenLabel ?? 'Close'}</span>
          </span>
        </span>
      </button>
    )
  }
)

