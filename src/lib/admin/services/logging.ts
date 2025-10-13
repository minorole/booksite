import { logAdminAction } from '@/lib/db/admin'

export async function logAnalysisOperation(
  type: 'INITIAL_ANALYSIS' | 'STRUCTURED_ANALYSIS',
  data: {
    admin_email: string
    image_url: string
    analysis_result?: any
    confirmed_info?: any
    structured_data?: any
  }
) {
  await logAdminAction({
    action: 'ANALYZE_IMAGE',
    admin_email: data.admin_email,
    metadata: {
      type,
      ...data,
    },
  })
}

