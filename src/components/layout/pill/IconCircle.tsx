"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type IconCircleProps = React.HTMLAttributes<HTMLSpanElement> & {
  scale?: number
  pad?: number
  background?: string
}

export function IconCircle({
  children,
  className,
  style,
  scale = 1,
  pad = 8,
  background,
  ...rest
}: IconCircleProps) {
  const outerStyle: React.CSSProperties = {
    width: "var(--nav-h)",
    height: "var(--nav-h)",
    background: background ?? "var(--base, #000)",
    padding: pad,
    ...style,
  }
  const innerStyle: React.CSSProperties | undefined =
    scale !== 1
      ? { transform: `scale(${scale})`, transformOrigin: "center" }
      : undefined

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full overflow-hidden",
        className
      )}
      style={outerStyle}
      {...rest}
    >
      <span className="inline-flex w-full h-full items-center justify-center" style={innerStyle}>
        {children}
      </span>
    </span>
  )
}
