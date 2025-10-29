import { z } from 'zod'

export const VisionAnalysisResultZ = z.object({
  confidence_scores: z.object({
    title_detection: z.number(),
    category_match: z.number(),
    overall: z.number(),
  }),
  language_detection: z.object({
    has_chinese: z.boolean(),
    has_english: z.boolean(),
    primary_language: z.enum(['zh', 'en']),
    script_types: z.array(z.enum(['simplified', 'traditional', 'english'])),
  }),
  extracted_text: z.object({
    title: z.object({
      zh: z.string().nullable(),
      en: z.string().nullable(),
      confidence: z.number(),
    }),
    author: z.object({
      zh: z.string().nullable(),
      en: z.string().nullable(),
      confidence: z.number(),
    }),
    publisher: z.object({
      zh: z.string().nullable(),
      en: z.string().nullable(),
      confidence: z.number(),
    }),
    other_text: z.array(z.string()),
  }),
  visual_elements: z.object({
    has_cover_image: z.boolean(),
    image_quality_score: z.number(),
    notable_elements: z.array(z.string()),
  }),
  cover_url: z.string().url().nullable(),
})

export type VisionAnalysisResultInput = z.infer<typeof VisionAnalysisResultZ>
