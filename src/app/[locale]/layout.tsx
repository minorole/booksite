import type { Metadata } from 'next';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { Toaster } from '@/components/ui/toaster';
import { assertLocaleParam } from '@/lib/i18n/assert';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const l = assertLocaleParam(locale, { notFoundOnError: true });
  return (
    <LocaleProvider initialLocale={l}>
      {children}
      <Toaster />
    </LocaleProvider>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  // Hreflang across locales for all pages under this segment
  await params; // currently unused, but required by signature in Next 15 types
  return {
    alternates: {
      languages: {
        en: '/en',
        zh: '/zh',
        'x-default': '/en',
      },
    },
  };
}
