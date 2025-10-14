"use client"

import React from "react"
import { cn } from "@/lib/utils"

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
  const Component: "span" | "div" = as === "div" ? "div" : "span"
  return (
    <Component
      className={cn(
        "inline-flex flex-col",
        tight && "leading-tight",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className
      )}
      {...rest}
    >
      <span className={cn(cnClassName)}>{cnText}</span>
      <span className={cn("text-muted-foreground -mt-0.5", enClassName)}>{enText}</span>
    </Component>
  )
}

export default Bilingual
