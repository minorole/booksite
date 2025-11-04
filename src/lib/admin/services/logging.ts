import { logAdminAction } from '@/lib/db/admin';

export async function logAnalysisOperation(
  type: 'INITIAL_ANALYSIS' | 'STRUCTURED_ANALYSIS',
  data: {
    admin_email: string;
    image_url: string;
    analysis_result?: unknown;
    confirmed_info?: unknown;
    structured_data?: unknown;
  },
) {
  await logAdminAction({
    action: 'ANALYZE_IMAGE',
    admin_email: data.admin_email,
    metadata: {
      type,
      ...data,
    },
  });
}
