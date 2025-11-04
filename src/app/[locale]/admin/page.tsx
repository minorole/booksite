import { redirect } from 'next/navigation';

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Redirect to the localized admin AI Chat page with explicit locale
  redirect(`/${locale}/admin/ai-chat`);
}
