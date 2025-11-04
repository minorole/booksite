'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { IconCircle } from './IconCircle';

type Props = {
  logoSrc: string;
  logoAlt?: string;
  logoHref?: string;
  ease?: string;
};

export function LogoButton({
  logoSrc,
  logoAlt = 'Logo',
  logoHref = '/',
  ease = 'power3.easeOut',
}: Props) {
  const logoImgRef = useRef<HTMLImageElement | null>(null);

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    gsap.set(img, { rotate: 0 });
    gsap.to(img, { rotate: 360, duration: 0.2, ease, overwrite: 'auto' });
  };

  const Img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc}
      alt={logoAlt}
      ref={logoImgRef}
      style={{ width: 'var(--logo, var(--nav-h))', height: 'var(--logo, var(--nav-h))' }}
      className="block rounded-full object-cover"
    />
  );

  return typeof logoHref === 'string' &&
    (logoHref.startsWith('/') || !/^(https?:|mailto:|tel:|#|\/\/)/.test(logoHref)) ? (
    <Link
      href={logoHref}
      aria-label="Home"
      role="menuitem"
      className="inline-flex items-center justify-center"
    >
      <IconCircle pad={0} background="transparent" onMouseEnter={handleLogoEnter}>
        {Img}
      </IconCircle>
    </Link>
  ) : (
    <a href={logoHref} aria-label="Home" className="inline-flex items-center justify-center">
      <IconCircle pad={0} background="transparent" onMouseEnter={handleLogoEnter}>
        {Img}
      </IconCircle>
    </a>
  );
}
