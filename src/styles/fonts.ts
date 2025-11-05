import localFont from 'next/font/local';

export const archivo = localFont({
  variable: '--font-archivo',
  display: 'block',
  preload: true,
  fallback: [],
  // Paths are relative to this file. Fonts are stored under public/ so they are served from /fonts/* at runtime.
  src: [
    { path: '../../public/fonts/archivo/Archivo-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../../public/fonts/archivo/Archivo-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../../public/fonts/archivo/Archivo-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../../public/fonts/archivo/Archivo-Bold.ttf', weight: '700', style: 'normal' },
  ],
});

export const mashanzheng = localFont({
  variable: '--font-mashanzheng',
  display: 'block',
  preload: true,
  fallback: [],
  adjustFontFallback: false,
  src: [
    {
      path: '../../public/fonts/ma-shan-zheng/MaShanZheng-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/ma-shan-zheng/MaShanZheng-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
  ],
});
