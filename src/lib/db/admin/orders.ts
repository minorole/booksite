import { getServerDb } from '@/lib/db/client'
import type { TablesUpdate } from '@/types/supabase.generated'

// Update order status/details
export async function updateOrderDb(id: string, patch: {
  status: string
  tracking_number?: string
  admin_notes?: string
  override_monthly?: boolean
  processed_by?: string
}): Promise<void> {
  const db = await getServerDb()
  const update: TablesUpdate<'orders'> = {
    status: patch.status,
    processed_by: patch.processed_by ?? null,
  }
  if (typeof patch.tracking_number === 'string') update.tracking_number = patch.tracking_number
  if (typeof patch.admin_notes === 'string') update.admin_notes = patch.admin_notes
  if (typeof patch.override_monthly === 'boolean') update.override_monthly = patch.override_monthly
  if (patch.status === 'PROCESSING') update.processing_started_at = new Date().toISOString()

  const { error } = await db.from('orders').update(update).eq('id', id)
  if (error) throw new Error(`Failed to update order: ${error.message}`)
}

// Fetch a single order by ID (basic projection)
export async function getOrderDb(id: string): Promise<{ order_id: string; status: string; tracking_number?: string | null } | null> {
  const db = await getServerDb()
  const { data, error } = await db
    .from('orders')
    .select('id, status, tracking_number')
    .eq('id', id)
    .single()
  if (error) return null
  if (!data) return null
  return { order_id: data.id, status: data.status, tracking_number: (data as { tracking_number: string | null }).tracking_number ?? null }
}

// Search orders by status or free-text (id/notes)
export async function searchOrdersDb(args: { status?: string | null; q?: string | null; limit?: number }): Promise<Array<{ order_id: string; status: string; tracking_number?: string | null }>> {
  const db = await getServerDb()
  let query = db.from('orders').select('id, status, tracking_number')
  if (args?.status) query = query.eq('status', args.status)
  if (args?.q && args.q.trim().length > 0) {
    const q = args.q.trim()
    // limited ilike search on id/tracking_number
    query = query.or(`id.ilike.%${q}%,tracking_number.ilike.%${q}%`)
  }
  const { data, error } = await query.limit(args?.limit ?? 50)
  if (error || !data) return []
  type Row = { id: string; status: string; tracking_number: string | null }
  return ((data ?? []) as Row[]).map((r) => ({ order_id: r.id, status: r.status, tracking_number: r.tracking_number ?? null }))
}
