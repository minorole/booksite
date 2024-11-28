import type { Metadata } from "next";
import { Noto_Sans_SC, Noto_Serif } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext"
import { Toaster } from "@/components/ui/toaster"

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${notoSerif.variable} ${notoSansSC.variable} font-sans antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
