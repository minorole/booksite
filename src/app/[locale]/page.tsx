import type { Metadata } from 'next';
import { HomeClient } from './HomeClient';
import { assertLocaleParam } from '@/lib/i18n/assert';

export default function HomePage() {
  return <HomeClient />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocaleParam(locale, { notFoundOnError: true });
  const title =
    l === 'zh'
      ? '中佛州净宗学会 — AMTBCF'
      : 'AMTBCF — Amitabha Buddhist Society of Central Florida';
  const description =
    l === 'zh'
      ? '免费佛书与法宝结缘平台'
      : 'Free Buddhist books and Dharma materials distribution platform';
  return {
    title,
    description,
    alternates: {
      canonical: `/${l}`,
    },
  };
}
