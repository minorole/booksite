'use client';

export const isExternalLink = (href?: string): boolean => {
  if (!href) return false;
  return (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('//') ||
    href.startsWith('mailto:') ||
    href.startsWith('tel:') ||
    href.startsWith('#')
  );
};

export const isRouterLink = (href?: string): boolean => !!href && !isExternalLink(href);

export const hrefMatches = (base?: string, current?: string): boolean =>
  !!base && !!current && (current === base || current.startsWith(base + '/'));
