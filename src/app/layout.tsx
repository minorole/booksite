import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"
import { cookies } from "next/headers"
import { LocaleProvider } from "@/contexts/LocaleContext"
import type { Locale } from "@/lib/i18n/config"

const notoSerif = Noto_Serif({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto-serif',
});

const notoSansSC = Noto_Sans_SC({ 
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans',
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
  const cookieLocale = (c.get('ui_locale')?.value === 'zh' ? 'zh' : 'en') as Locale
  return (
    <html lang={cookieLocale} suppressHydrationWarning>
      <body className={`${notoSerif.variable} ${notoSansSC.variable} font-sans antialiased`}>
        <LocaleProvider initialLocale={cookieLocale}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
