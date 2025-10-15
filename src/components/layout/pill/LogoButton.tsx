"use client"

import Link from "next/link"
import { useRef } from "react"
import { gsap } from "gsap"

type Props = {
  logoSrc: string
  logoAlt?: string
  logoHref?: string
  ease?: string
}

export function LogoButton({ logoSrc, logoAlt = "Logo", logoHref = "/", ease = "power3.easeOut" }: Props) {
  const logoImgRef = useRef<HTMLImageElement | null>(null)

  const handleLogoEnter = () => {
    const img = logoImgRef.current
    if (!img) return
    gsap.set(img, { rotate: 0 })
    gsap.to(img, { rotate: 360, duration: 0.2, ease, overwrite: "auto" })
  }

  const commonProps = {
    onMouseEnter: handleLogoEnter,
    className: "rounded-full p-2 inline-flex items-center justify-center overflow-hidden",
    style: { width: "var(--nav-h)", height: "var(--nav-h)", background: "var(--base, #000)" },
  }

  // eslint-disable-next-line @next/next/no-img-element
  const Img = <img src={logoSrc} alt={logoAlt} ref={logoImgRef} className="w-full h-full object-cover block rounded-full" />

  return typeof logoHref === "string" && (logoHref.startsWith("/") || !/^(https?:|mailto:|tel:|#|\/\/)/.test(logoHref)) ? (
    <Link href={logoHref} aria-label="Home" role="menuitem" {...commonProps}>
      {Img}
    </Link>
  ) : (
    <a href={logoHref} aria-label="Home" {...commonProps}>
      {Img}
    </a>
  )
}

