import { getServerDb } from '@/lib/db/client'
import type { AdminAction } from '@/lib/db/enums'

// Admin action log helper
export async function logAdminAction(data: {
  action: AdminAction
  admin_email: string
  book_id?: string | null
  book_title?: string | null
  metadata?: any
  llm_context?: any
  related_items?: string[] | null
  confidence?: number | null
  session_id?: string | null
  prompt_version?: number | null
}) {
  const db = await getServerDb()
  const payload: any = {
    action: data.action,
    admin_email: data.admin_email,
    book_id: data.book_id ?? null,
    book_title: data.book_title ?? null,
    metadata: data.metadata ?? null,
    llm_context: data.llm_context ?? null,
    related_items: data.related_items ?? null,
    confidence: data.confidence ?? null,
    session_id: data.session_id ?? null,
    prompt_version: data.prompt_version ?? null,
  }
  const { error } = await db.from('admin_logs').insert(payload)
  if (error) throw new Error(`Failed to log admin action: ${error.message}`)
}

