import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext"
import { cookies, headers } from "next/headers"
import type { Locale } from "@/lib/i18n/config"
import { detectLocaleFromHeader } from "@/lib/i18n/config"

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
  // Do not render a fallback; wait for Archivo to load
  display: 'block',
  adjustFontFallback: false,
  fallback: [],
  // Ensure Archivo is available at first paint
  preload: true,
});

export const metadata: Metadata = {
  title: "AMTBCF - Amitabha Buddhist Society of Central Florida",
  description: "Free Buddhist books and Dharma materials distribution platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const c = await cookies()
  const h = await headers()
  const hinted = h.get('x-ui-locale')
  const hintedLocale: Locale | null = hinted === 'zh' ? 'zh' : (hinted === 'en' ? 'en' : null)
  const cookieVal = c.get('ui_locale')?.value
  const cookieLocale = (cookieVal === 'zh' ? 'zh' : (cookieVal === 'en' ? 'en' : detectLocaleFromHeader(h.get('accept-language')))) as Locale
  const effectiveLocale = (hintedLocale ?? cookieLocale) as Locale
  return (
    <html lang={effectiveLocale} className={`${archivo.className} ${archivo.variable}`} suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
