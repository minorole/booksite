import { updateOrderDb, logAdminAction } from '@/lib/db/admin'
import { isValidUUID, handleOperationError } from './utils'
import { type AdminOperationResult, type OrderUpdate, type OrderBase } from '@/lib/admin/types'

export async function updateOrder(args: OrderUpdate, adminEmail: string): Promise<AdminOperationResult> {
  try {
    if (!isValidUUID(args.order_id)) {
      return {
        success: false,
        message: 'Invalid order ID format',
        error: { code: 'validation_error', details: 'invalid_uuid' },
      }
    }

    await updateOrderDb(args.order_id, {
      status: args.status,
      tracking_number: args.tracking_number,
      admin_notes: args.admin_notes,
      override_monthly: args.override_monthly,
      processed_by: adminEmail,
    })

    await logAdminAction({
      action: 'UPDATE_STATUS',
      admin_email: adminEmail,
      metadata: {
        order_id: args.order_id,
        status: args.status,
        tracking_number: args.tracking_number,
        override_monthly: args.override_monthly,
      },
    })

    return {
      success: true,
      message: 'Order updated successfully',
      data: { order: { order_id: args.order_id, status: args.status, tracking_number: args.tracking_number } as OrderBase },
    }
  } catch (error) {
    return handleOperationError(error, 'update order')
  }
}

