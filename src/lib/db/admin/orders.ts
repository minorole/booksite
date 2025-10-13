import { getServerDb } from '@/lib/db/client'

// Update order status/details
export async function updateOrderDb(id: string, patch: {
  status: string
  tracking_number?: string
  admin_notes?: string
  override_monthly?: boolean
  processed_by?: string
}): Promise<void> {
  const db = await getServerDb()
  const update: any = {
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

