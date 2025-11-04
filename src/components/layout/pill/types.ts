'use client';

import type { ReactNode } from 'react';

export type PillNavItem = {
  label?: ReactNode;
  href?: string;
  ariaLabel?: string;
  custom?: ReactNode;
  children?: { label: ReactNode; href: string; ariaLabel?: string }[];
  shape?: 'pill' | 'circle';
};
