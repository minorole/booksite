import { standardizeImageUrl } from '../../image-upload';
import { logAnalysisOperation } from '../logging';
import { handleOperationError } from '../utils';
import { itemAnalysisSchema } from './schemas';
import { callVisionJSON } from './helpers';
import { type AdminOperationResult } from '@/lib/admin/types';

export async function analyzeItemPhoto(
  imageUrl: string,
  adminEmail: string,
): Promise<AdminOperationResult> {
  try {
    const standardizedUrl = await standardizeImageUrl(imageUrl);

    const json = await callVisionJSON<{
      name?: string | null;
      type?: string | null;
      material?: string | null;
      finish?: string | null;
      size?: string | null;
      dimensions?: string | null;
      category_suggestion?: import('@/lib/db/enums').CategoryType | null;
      tags?: string[];
      quality_issues?: string[];
      cover_url?: string;
    }>('ItemAnalysis', itemAnalysisSchema, [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this item photo (non-book). Extract name/type, material/finish, size/dimensions, category suggestion (DHARMA_ITEMS or BUDDHA_STATUES), tags, and quality issues. Respond with ONLY valid JSON matching the schema.',
          },
          { type: 'image_url', image_url: { url: standardizedUrl } },
        ],
      },
    ]);

    const structured = {
      name: json.name ?? null,
      type: json.type ?? null,
      material: json.material ?? null,
      finish: json.finish ?? null,
      size: json.size ?? null,
      dimensions: json.dimensions ?? null,
      category_suggestion: json.category_suggestion ?? undefined,
      tags: Array.isArray(json.tags) ? json.tags : [],
      quality_issues: Array.isArray(json.quality_issues) ? json.quality_issues : [],
      cover_url: standardizedUrl,
    };

    await logAnalysisOperation('STRUCTURED_ANALYSIS', {
      admin_email: adminEmail,
      image_url: standardizedUrl,
      analysis_result: { item_analysis: structured },
    });

    return {
      success: true,
      message: 'Item analysis complete',
      data: { item_analysis: { structured_data: structured } },
    };
  } catch (error) {
    return handleOperationError(error, 'analyze item photo');
  }
}
