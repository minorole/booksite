import { vi } from 'vitest'

export function stubFetchOkImage() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(null, {
    status: 200,
    headers: { 'content-type': 'image/jpeg' },
  })))
}

export function restoreFetch() {
  // @ts-ignore - Vitest adds unstub API via vi.unstubAllGlobals in newer versions
  if ((vi as any).unstubAllGlobals) (vi as any).unstubAllGlobals()
}

