import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { detectLocaleFromHeader } from '@/lib/i18n/config'

export default async function ManualManagementPage() {
  const h = await headers()
  const locale = detectLocaleFromHeader(h.get('accept-language'))
  redirect(`/${locale}/admin/manual`)
}
