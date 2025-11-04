'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { PillNavItem } from './types';

type Props = {
  item: PillNavItem;
  activeHref?: string;
  ease?: string;
  index: number;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

const isExternalLink = (href: string) =>
  href.startsWith('http://') ||
  href.startsWith('https://') ||
  href.startsWith('//') ||
  href.startsWith('mailto:') ||
  href.startsWith('tel:') ||
  href.startsWith('#');
const isRouterLink = (href: string) => href && !isExternalLink(href);
const hrefMatches = (base?: string, current?: string) =>
  !!base && !!current && (current === base || current.startsWith(base + '/'));

export function DesktopPillItem({
  item,
  activeHref,
  ease = 'power3.easeOut',
  index,
  isOpen,
  onOpen,
  onClose,
}: Props) {
  const circleRef = useRef<HTMLSpanElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const activeTweenRef = useRef<gsap.core.Tween | null>(null);
  const ddRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLLIElement | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleClose = (delay = 120) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => onClose(), delay);
  };
  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const isLink = Boolean(item.href);
  const isActive =
    (!!item.href && hrefMatches(item.href, activeHref)) ||
    (item.children?.some((c) => hrefMatches(c.href, activeHref)) ?? false);

  useEffect(() => {
    const circle = circleRef.current;
    const wrapper = wrapperRef.current;
    if (!circle || !wrapper) return;
    const pill = wrapper.querySelector('[data-pill]') as HTMLElement | null;
    if (!pill) return;
    const layout = () => {
      const rect = pill.getBoundingClientRect();
      const { width: w, height: h } = rect;
      // Base radius that covers a pill (capsule) of width w and height h.
      const R0 = ((w * w) / 4 + h * h) / (2 * h);
      // Add a small margin so the animated circle fully covers the pill even when sizes change.
      const margin = Math.max(6, h * 0.2);
      const R = R0 + margin;
      const D = Math.ceil(2 * R);
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4)));
      const originY = D - delta;
      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;
      gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${originY}px` });
      const label = pill.querySelector('.pill-label') as HTMLElement | null;
      const white = pill.querySelector('.pill-label-hover') as HTMLElement | null;
      if (label) gsap.set(label, { y: 0 });
      if (white) gsap.set(white, { y: h + 12, opacity: 0 });
      tlRef.current?.kill();
      const tl = gsap.timeline({ paused: true });
      tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0);
      if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0);
      if (white) {
        gsap.set(white, { y: Math.ceil(h + 100), opacity: 0 });
        tl.to(white, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0);
      }
      tlRef.current = tl;
    };
    layout();
    const onResize = () => layout();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [item, ease]);

  useEffect(() => {
    const dd = ddRef.current;
    if (!dd) return;
    if (isOpen) {
      gsap.set(dd, { visibility: 'visible' });
      gsap.to(dd, { opacity: 1, y: 0, duration: 0.2, ease });
    } else {
      gsap.to(dd, {
        opacity: 0,
        y: 6,
        duration: 0.15,
        ease,
        onComplete: () => {
          gsap.set(dd, { visibility: 'hidden' });
        },
      });
    }
  }, [isOpen, ease]);

  // Keep the pill's hover animation active while the dropdown is open.
  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    activeTweenRef.current?.kill();
    activeTweenRef.current = tl.tweenTo(isOpen ? tl.duration() : 0, {
      duration: 0.2,
      ease,
      overwrite: 'auto',
    });
  }, [isOpen, ease]);

  // Cleanup any pending hover-intent timer on unmount.
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleEnter = () => {
    const tl = tlRef.current;
    if (!tl) return;
    activeTweenRef.current?.kill();
    activeTweenRef.current = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: 'auto' });
  };
  const handleLeave = () => {
    const tl = tlRef.current;
    if (!tl) return;
    activeTweenRef.current?.kill();
    activeTweenRef.current = tl.tweenTo(0, { duration: 0.2, ease, overwrite: 'auto' });
  };

  const pillStyle: React.CSSProperties = {
    background: 'var(--pill-bg, #fff)',
    color: 'var(--pill-text, var(--base, #000))',
    paddingLeft: 'var(--pill-pad-x)',
    paddingRight: 'var(--pill-pad-x)',
  };
  const isCircle = item.shape === 'circle';
  const pillStyleCustom: React.CSSProperties = {
    background: 'var(--pill-bg, #fff)',
    color: 'var(--pill-text, var(--base, #000))',
    paddingLeft: isCircle ? 0 : ('var(--pill-pad-x)' as React.CSSProperties['paddingLeft']),
    paddingRight: isCircle ? 0 : ('var(--pill-pad-x)' as React.CSSProperties['paddingRight']),
  };
  const basePillClasses =
    'relative overflow-hidden inline-flex items-center justify-center h-full no-underline rounded-full box-border font-semibold text-[16px] leading-[0] uppercase tracking-[0.2px] whitespace-nowrap cursor-pointer px-0';
  const basePillClassesCustom = isCircle
    ? 'relative overflow-hidden inline-flex items-center justify-center h-full no-underline rounded-full box-border font-medium text-[14px] tracking-[0.2px] whitespace-nowrap cursor-pointer p-0 aspect-square'
    : 'relative overflow-hidden inline-flex items-center justify-center h-full no-underline rounded-full box-border font-medium text-[14px] tracking-[0.2px] whitespace-nowrap cursor-pointer px-2';

  const PillContent = (
    <>
      <span
        ref={circleRef}
        className="hover-circle pointer-events-none absolute bottom-0 left-1/2 z-[1] block rounded-full"
        style={{ background: 'var(--base, #000)', willChange: 'transform' }}
        aria-hidden="true"
      />
      {item.custom ? (
        <span className="relative z-[2] inline-flex items-center">{item.custom}</span>
      ) : (
        <span className="label-stack relative z-[2] inline-block leading-[1]">
          <span
            className="pill-label relative z-[2] inline-block leading-[1]"
            style={{ willChange: 'transform' }}
          >
            {item.label}
          </span>
          <span
            className="pill-label-hover absolute top-0 left-0 z-[3] inline-block"
            style={{ color: 'var(--hover-text, #fff)', willChange: 'transform, opacity' }}
            aria-hidden="true"
          >
            {item.label}
          </span>
        </span>
      )}
      {isActive && (
        <span
          className="absolute -bottom-[6px] left-1/2 z-[4] h-3 w-3 -translate-x-1/2 rounded-full"
          style={{ background: 'var(--base, #000)' }}
          aria-hidden="true"
        />
      )}
    </>
  );

  return (
    <li
      ref={wrapperRef}
      role="none"
      className="relative flex h-full"
      onMouseEnter={cancelClose}
      onMouseLeave={(e) => {
        const root = wrapperRef.current;
        const t = e.relatedTarget as Node | null;
        if (!root || (t && root.contains(t))) return;
        scheduleClose(120);
      }}
    >
      {item.custom && !isLink ? (
        <div
          role="menuitem"
          tabIndex={0}
          className={basePillClassesCustom}
          style={pillStyleCustom}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          data-pill
        >
          {PillContent}
        </div>
      ) : item.children && item.children.length > 0 ? (
        <>
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            className={basePillClasses}
            style={pillStyle}
            onMouseEnter={() => {
              handleEnter();
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = setTimeout(() => onOpen(), 120);
              cancelClose();
            }}
            onMouseLeave={() => {
              handleLeave();
              if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
                hoverTimerRef.current = null;
              }
              // wrapper onMouseLeave handles closing when exiting entire region
            }}
            onClick={() => (isOpen ? onClose() : onOpen())}
            data-pill
          >
            {PillContent}
          </button>
          <div
            ref={ddRef}
            className="absolute top-[calc(100%+4px)] left-1/2 z-[999] -translate-x-1/2 overflow-hidden rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.16)] ring-1 ring-black/10"
            style={{
              background: 'var(--base, #000)',
              maxWidth: 'min(calc(100vw - 24px), 320px)',
              visibility: 'hidden',
              opacity: 0,
              transform: 'translateY(6px)',
            }}
            onMouseEnter={() => {
              if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
                hoverTimerRef.current = null;
              }
              cancelClose();
              onOpen();
            }}
            onMouseLeave={() => {
              if (hoverTimerRef.current) {
                clearTimeout(hoverTimerRef.current);
                hoverTimerRef.current = null;
              }
              scheduleClose(120);
            }}
          >
            <ul className="m-0 flex list-none flex-col gap-[6px] p-[6px]" role="menu">
              {item.children.map((child, ci) => {
                const defaultStyle: React.CSSProperties = {
                  background: 'var(--pill-bg, #fff)',
                  color: 'var(--pill-text, #000)',
                };
                const hoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.currentTarget.style.background = 'var(--base)';
                  e.currentTarget.style.color = 'var(--hover-text, #fff)';
                };
                const hoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.currentTarget.style.background = 'var(--pill-bg, #fff)';
                  e.currentTarget.style.color = 'var(--pill-text, #000)';
                };
                const cls =
                  'block py-3 px-4 text-[16px] font-medium rounded-[50px] transition-all duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] whitespace-nowrap';
                return (
                  <li key={(child.href ?? 'child-') + ci} role="none">
                    {isRouterLink(child.href) ? (
                      <Link
                        role="menuitem"
                        href={child.href}
                        aria-label={
                          child.ariaLabel ||
                          (typeof child.label === 'string' ? child.label : undefined)
                        }
                        className={cls}
                        style={defaultStyle}
                        onMouseEnter={hoverIn}
                        onMouseLeave={hoverOut}
                        onClick={onClose}
                      >
                        {child.label}
                      </Link>
                    ) : (
                      <a
                        role="menuitem"
                        href={child.href}
                        aria-label={
                          child.ariaLabel ||
                          (typeof child.label === 'string' ? child.label : undefined)
                        }
                        className={cls}
                        style={defaultStyle}
                        onMouseEnter={hoverIn}
                        onMouseLeave={hoverOut}
                        onClick={onClose}
                      >
                        {child.label}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      ) : isLink && isRouterLink(item.href!) ? (
        <Link
          role="menuitem"
          href={item.href!}
          className={basePillClasses}
          style={pillStyle}
          aria-label={item.ariaLabel || (typeof item.label === 'string' ? item.label : undefined)}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          data-pill
        >
          {PillContent}
        </Link>
      ) : (
        <a
          role="menuitem"
          href={item.href}
          className={basePillClasses}
          style={pillStyle}
          aria-label={item.ariaLabel || (typeof item.label === 'string' ? item.label : undefined)}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          data-pill
        >
          {PillContent}
        </a>
      )}
    </li>
  );
}
