"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

type LogoProps = {
  height?: number
  className?: string
  href?: string
  alt?: string
}

export function Logo({ height = 32, className, href = "/", alt = "AMTBCF" }: LogoProps) {
  const size = { height, width: height }
  return (
    <Link href={href} aria-label="Go to homepage" className={cn("inline-flex items-center", className)}>
      {/* Using favicon.ico as the mark; consider swapping to SVG/PNG later */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/favicon.ico" alt={alt} height={size.height} width={size.width} className="select-none" />
    </Link>
  )
}

