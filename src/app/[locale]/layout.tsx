import type { Metadata } from "next"

export default function LocaleLayout({ children }: { children: React.ReactNode }) {
  return children
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  // Hreflang across locales for all pages under this segment
  await params // currently unused, but required by signature in Next 15 types
  return {
    alternates: {
      languages: {
        en: '/en',
        zh: '/zh',
        'x-default': '/en',
      },
    },
  }
}
