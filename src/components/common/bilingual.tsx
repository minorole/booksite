"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { useLocale } from "@/contexts/LocaleContext"

export type BilingualProps = {
  as?: "span" | "div"
  cnText: React.ReactNode
  enText: React.ReactNode
  className?: string
  cnClassName?: string
  enClassName?: string
  align?: "left" | "center" | "right"
  tight?: boolean
} & React.HTMLAttributes<HTMLSpanElement>

export function Bilingual({
  as,
  cnText,
  enText,
  className,
  cnClassName,
  enClassName,
  align = "left",
  tight = true,
  ...rest
}: BilingualProps) {
  const { locale } = useLocale()
  const Component: "span" | "div" = as === "div" ? "div" : "span"
  const showZh = locale === 'zh'
  return (
    <Component
      className={cn(
        "inline-flex",
        tight && "leading-tight",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...rest}
    >
      {showZh ? (
        <span className={cn(cnClassName)}>{cnText}</span>
      ) : (
        <span className={cn(enClassName)}>{enText}</span>
      )}
    </Component>
  )
}

export default Bilingual
