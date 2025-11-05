import type { Metadata } from 'next';
import { archivo, mashanzheng } from '@/styles/fonts';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { cookies, headers } from 'next/headers';
import type { Locale } from '@/lib/i18n/config';
import { detectLocaleFromHeader } from '@/lib/i18n/config';

// Archivo is self-hosted via next/font/local in src/styles/fonts.ts

export const metadata: Metadata = {
  title: 'AMTBCF - Amitabha Buddhist Society of Central Florida',
  description: 'Free Buddhist books and Dharma materials distribution platform',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const c = await cookies();
  const h = await headers();
  const hinted = h.get('x-ui-locale');
  const hintedLocale: Locale | null = hinted === 'zh' ? 'zh' : hinted === 'en' ? 'en' : null;
  const cookieVal = c.get('ui_locale')?.value;
  const cookieLocale = (
    cookieVal === 'zh'
      ? 'zh'
      : cookieVal === 'en'
        ? 'en'
        : detectLocaleFromHeader(h.get('accept-language'))
  ) as Locale;
  const effectiveLocale = (hintedLocale ?? cookieLocale) as Locale;
  return (
    <html
      lang={effectiveLocale}
      className={`${archivo.variable} ${mashanzheng.variable}`}
      suppressHydrationWarning
    >
      <body className={`font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
