import { redirect } from 'next/navigation'

export default function AdminPage() {
  // Mirror the non-localized admin root redirect but keep locale in URL
  redirect('./ai-chat')
}

