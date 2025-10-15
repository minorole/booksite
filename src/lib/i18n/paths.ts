export function replaceLeadingLocale(pathname: string, next: 'en' | 'zh'): string {
  const base = pathname.split('?')[0]
  const segs = base.split('/')
  // ['', maybe-locale, ...]
  if (segs.length > 1 && (segs[1] === 'en' || segs[1] === 'zh')) {
    segs[1] = next
    const joined = segs.join('/') || `/${next}`
    return joined
  }
  // Non-localized path, just prefix
  return `/${next}${base.startsWith('/') ? '' : '/'}${base}`
}

