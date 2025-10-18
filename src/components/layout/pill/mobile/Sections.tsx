"use client"

import Link from "next/link"
import type { PillNavItem } from "../types"
import { hrefMatches, isRouterLink } from "./utils"
import { Bilingual } from "@/components/common/bilingual"

type LanguageRowProps = {
  langItems: PillNavItem[]
  onClose: () => void
}

export function LanguageRow({ langItems, onClose }: LanguageRowProps) {
  if (!langItems?.length) return null
  return (
    <div className="mb-2">
      <ul className="flex flex-row flex-wrap items-center gap-2 m-0 p-0 list-none">
        {langItems.map((lang, i) => (
          <li key={(lang.href ?? 'lang-') + i}>
            {isRouterLink(lang.href) ? (
              <Link
                href={lang.href as string}
                className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-md bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
                onClick={onClose}
              >
                {lang.label}
              </Link>
            ) : (
              <a
                href={lang.href}
                className="inline-flex items-center px-2.5 py-1.5 text-sm font-medium rounded-md bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
                onClick={onClose}
              >
                {lang.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

type MainListProps = {
  items: PillNavItem[]
  activeHref?: string
  onClose: () => void
}

export function MainList({ items, activeHref, onClose }: MainListProps) {
  const sectionTitle = (content: React.ReactNode) => (
    <div className="px-1.5 py-1 text-[13px] font-semibold text-neutral-500/90 uppercase tracking-wide">{content}</div>
  )

  return (
    <ul className="list-none m-0 p-0 flex flex-col gap-1 items-start">
      {items.map((item, i) => (
        <li key={(item.href ?? "custom-") + i} className="w-full">
          {item.custom && !item.href ? (
            <div className="sm-item inline-flex text-left py-3 px-1.5 text-[16px] font-medium rounded-[10px] whitespace-nowrap" style={{ color: 'var(--base, #111)' }}>{item.custom}</div>
          ) : item.children && item.children.length > 0 ? (
            <>
              {sectionTitle(item.label)}
              {item.children.map((child, ci) => (
                isRouterLink(child.href) ? (
                  <Link
                    key={(child.href ?? "child-") + ci}
                    href={child.href}
                    className="sm-item block w-full py-3 text-2xl font-semibold tracking-tight text-neutral-900 transition-colors duration-300 hover:text-[var(--sm-accent,#5227FF)]"
                    onClick={onClose}
                    aria-current={hrefMatches(child.href, activeHref) ? 'page' : undefined}
                  >
                    {child.label}
                  </Link>
                ) : (
                  <a
                    key={(child.href ?? "child-") + ci}
                    href={child.href}
                    className="sm-item block w-full py-3 text-2xl font-semibold tracking-tight text-neutral-900 transition-colors duration-300 hover:text-[var(--sm-accent,#5227FF)]"
                    onClick={onClose}
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
              className="sm-item block w-full py-3 text-2xl font-semibold tracking-tight text-neutral-900 transition-colors duration-300 hover:text-[var(--sm-accent,#5227FF)]"
              onClick={onClose}
              aria-current={hrefMatches(item.href, activeHref) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ) : (
            <a
              href={item.href}
              className="sm-item block w-full py-3 text-2xl font-semibold tracking-tight text-neutral-900 transition-colors duration-300 hover:text-[var(--sm-accent,#5227FF)]"
              onClick={onClose}
              aria-current={hrefMatches(item.href, activeHref) ? 'page' : undefined}
            >
              {item.label}
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

type AccountSectionProps = {
  signInItem?: PillNavItem
  hasUserCustom: boolean
  onClose: () => void
  onSignOut: () => void
}

export function AccountSection({ signInItem, hasUserCustom, onClose, onSignOut }: AccountSectionProps) {
  // Show only account-specific actions here: Sign In (when logged out) or Sign out (when logged in via avatar-less state).
  if (!signInItem && !hasUserCustom) return null
  return (
    <div className="mt-4 pt-3 border-t border-neutral-200">
      <ul className="list-none m-0 p-0 flex flex-col gap-1 items-start">
        {signInItem && !hasUserCustom && (
          isRouterLink(signInItem.href || '') ? (
            <li>
              <Link
                href={signInItem.href as string}
                className="sm-item block w-full py-3 text-xl font-semibold tracking-tight text-neutral-900 transition-colors duration-300 hover:text-[var(--sm-accent,#5227FF)]"
                onClick={onClose}
              >
                {signInItem.label}
              </Link>
            </li>
          ) : (
            <li>
              <a
                href={signInItem.href}
                className="sm-item block w-full py-3 text-xl font-semibold tracking-tight text-neutral-900 transition-colors duration-300 hover:text-[var(--sm-accent,#5227FF)]"
                onClick={onClose}
              >
                {signInItem.label}
              </a>
            </li>
          )
        )}
        {hasUserCustom && (
          <li>
            <button
              type="button"
              onClick={onSignOut}
              className="sm-item block w-full py-3 text-left text-xl font-semibold tracking-tight text-red-600"
            >
              <Bilingual cnText="退出登录" enText="Sign out" />
            </button>
          </li>
        )}
      </ul>
    </div>
  )
}
