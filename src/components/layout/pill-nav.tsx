'use client';

import { cn } from '@/lib/utils';
import { DesktopMenu } from './pill/DesktopMenu';
import { MobileMenu } from './pill/MobileMenu';
import { LogoButton } from './pill/LogoButton';
import { IconCircle } from './pill/IconCircle';
export type { PillNavItem } from './pill/types';
// Using the standalone LogoButton for desktop to match the original style and avoid image sizing quirks

type PillNavProps = {
  logoSrc: string;
  logoAlt?: string;
  logoHref?: string;
  items: import('./pill/types').PillNavItem[];
  activeHref?: string;
  className?: string;
  ease?: string;
  baseColor?: string;
  pillColor?: string;
  hoveredPillTextColor?: string;
  pillTextColor?: string;
  mobileAccentColor?: string;
  onMobileMenuClick?: () => void;
  initialLoadAnimation?: boolean;
  mobileToggleLabel?: React.ReactNode;
  mobileToggleOpenLabel?: React.ReactNode;
};

export function PillNav({
  logoSrc,
  logoAlt = 'Logo',
  logoHref = '/',
  items,
  activeHref,
  className = '',
  ease = 'power3.easeOut',
  baseColor = '#000000',
  pillColor = '#ffffff',
  hoveredPillTextColor = '#ffffff',
  pillTextColor,
  mobileAccentColor = '#5227FF',
  onMobileMenuClick,
  initialLoadAnimation = true,
  mobileToggleLabel,
  mobileToggleOpenLabel,
}: PillNavProps) {
  const resolvedPillTextColor = pillTextColor ?? baseColor;

  const cssVars: React.CSSProperties = {
    ['--base' as string]: baseColor,
    ['--pill-bg' as string]: pillColor,
    ['--hover-text' as string]: hoveredPillTextColor,
    ['--pill-text' as string]: resolvedPillTextColor,
    ['--sm-accent' as string]: mobileAccentColor,
    ['--nav-h' as string]: '42px',
    ['--logo' as string]: '36px',
    ['--pill-pad-x' as string]: '18px',
    ['--pill-gap' as string]: '3px',
  };

  const sanitized =
    (activeHref || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'root';
  const menuId = `mobile-menu-${sanitized}`;

  // Desktop-only: merge separate language pills (中文/English) into one dropdown item
  const desktopItems = (() => {
    const arr = [...items];
    const langIdxs: number[] = [];
    let zhHref: string | undefined;
    let enHref: string | undefined;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i] as unknown as { label?: string; href?: string };
      const label = it?.label;
      if (
        typeof label === 'string' &&
        (label === '中文' || label === 'English' || label === 'ENGLISH')
      ) {
        langIdxs.push(i);
        if (label === '中文') zhHref = it.href;
        else enHref = it.href;
      }
    }
    if (!langIdxs.length) return arr;
    const insertAt = langIdxs[0];
    for (let j = langIdxs.length - 1; j >= 0; j--) arr.splice(langIdxs[j], 1);
    const currentIsZh = (activeHref || '').startsWith('/zh');
    const label = currentIsZh ? 'English' : '中文';
    const children: { label: React.ReactNode; href: string; ariaLabel?: string }[] = [];
    if (zhHref) children.push({ label: '中文', href: zhHref });
    if (enHref) children.push({ label: 'English', href: enHref });
    const combined: import('./pill/types').PillNavItem = { label, children };
    arr.splice(insertAt, 0, combined);
    return arr;
  })();

  // Mobile: render the user custom (avatar dropdown) next to the logo if present
  const mobileUserCustom = items.find((i) => i.shape === 'circle' && i.custom)?.custom;

  return (
    <div className={cn('w-full', className)}>
      <nav
        className="relative box-border flex w-full items-center justify-between gap-2 md:w-full md:justify-center md:gap-4"
        aria-label="Primary"
        style={cssVars}
      >
        <div
          className="hidden items-center md:flex"
          style={{ gap: 'var(--pill-gap)' as React.CSSProperties['gap'] }}
        >
          <LogoButton logoSrc={logoSrc} logoAlt={logoAlt} logoHref={logoHref} ease={ease} />
          <div className="md:[--logo:44px] md:[--nav-h:52px] md:[--pill-gap:4px] md:[--pill-pad-x:22px]">
            <DesktopMenu
              items={desktopItems}
              activeHref={activeHref}
              ease={ease}
              initialLoadAnimation={initialLoadAnimation}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <LogoButton logoSrc={logoSrc} logoAlt={logoAlt} logoHref={logoHref} ease={ease} />
          {mobileUserCustom ? <IconCircle scale={0.86}>{mobileUserCustom}</IconCircle> : null}
        </div>
        <MobileMenu
          items={items}
          activeHref={activeHref}
          ease={ease}
          onToggle={onMobileMenuClick}
          menuId={menuId}
        />
      </nav>
    </div>
  );
}
