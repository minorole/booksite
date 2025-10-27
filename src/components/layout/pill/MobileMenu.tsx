"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import type { PillNavItem } from "./types"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useLocale } from "@/contexts/LocaleContext"
import { LanguageRow, MainList, AccountSection } from "./mobile/Sections"
import { useMobileMenuAnimation } from "./mobile/useMobileMenuAnimation"
import { MobileMenuToggle } from "./mobile/MobileMenuToggle"

type Props = {
  items: PillNavItem[]
  activeHref?: string
  ease?: string
  onToggle?: () => void
  menuId?: string
}

// Link helpers moved to ./mobile/utils

export function MobileMenu({ items, activeHref, ease = "power3.easeOut", onToggle, menuId: providedMenuId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const { locale } = useLocale()
  const menuId = providedMenuId || 'mobile-menu-root'

  const { isOpen, requestClose, handleOpenChange, toggle, refs } = useMobileMenuAnimation({ ease })
  const { toggleBtnRef, overlayRef, panelRef, preLayersRef } = refs

  const ariaClosed = locale === 'zh' ? '打开菜单' : 'Open menu'
  const ariaOpen = locale === 'zh' ? '关闭菜单' : 'Close menu'

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
      requestClose()
      router.push(`/${locale}`)
      router.refresh()
    }
  }

  return (
    <>
      {/* Toggle */}
      <MobileMenuToggle
        ref={toggleBtnRef}
        isOpen={isOpen}
        onClick={() => { toggle(); onToggle?.() }}
        menuId={menuId}
        ariaLabelClosed={ariaClosed}
        ariaLabelOpen={ariaOpen}
      />

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
          <DialogPrimitive.Content ref={panelRef} id={menuId} className="md:hidden fixed inset-y-0 right-0 z-[999] overflow-y-auto overscroll-contain" style={{ width: 'min(50vw, 420px)' }}>
            {/* A11y: Hidden dialog title/description for screen readers */}
            <DialogPrimitive.Title className="sr-only">Mobile navigation</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Primary site navigation. Use the links below to navigate.
            </DialogPrimitive.Description>
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
