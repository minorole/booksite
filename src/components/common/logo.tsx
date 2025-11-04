'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

type LogoProps = {
  height?: number;
  className?: string;
  href?: string;
  alt?: string;
  src?: string;
  variant?: 'plain' | 'badge';
};

export function Logo({
  height = 32,
  className,
  href = '/',
  alt = 'AMTBCF',
  src = '/favicon.ico',
  variant = 'plain',
}: LogoProps) {
  const size = { height, width: height };
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      height={size.height}
      width={size.width}
      className={cn('select-none', variant === 'badge' && 'rounded-full')}
    />
  );

  return (
    <Link
      href={href}
      aria-label="Go to homepage"
      className={cn('inline-flex items-center', className)}
    >
      {variant === 'badge' ? (
        <span className="inline-flex items-center justify-center rounded-full bg-white/5 p-1 ring-1 ring-white/10 backdrop-blur-sm">
          {img}
        </span>
      ) : (
        img
      )}
    </Link>
  );
}
