export function visionStructuredResponseFormat(name: string, schema: Record<string, unknown>) {
  return {
    type: 'json_schema',
    json_schema: {
      name,
      schema,
      strict: true,
    },
  }
}

// Cover analysis — initial stage schema
// (Removed initialCoverAnalysisSchema — we now run structured-only analysis)

// Cover analysis — structured (VisionAnalysisResult)
export const structuredVisionAnalysisSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    confidence_scores: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title_detection: { type: 'number' },
        category_match: { type: 'number' },
        overall: { type: 'number' },
      },
      required: ['title_detection', 'category_match', 'overall'],
    },
    language_detection: {
      type: 'object',
      additionalProperties: false,
      properties: {
        has_chinese: { type: 'boolean' },
        has_english: { type: 'boolean' },
        primary_language: { type: 'string', enum: ['zh', 'en'] },
        script_types: { type: 'array', items: { type: 'string', enum: ['simplified', 'traditional', 'english'] } },
      },
      required: ['has_chinese', 'has_english', 'primary_language', 'script_types'],
    },
    extracted_text: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: {
          type: 'object',
          additionalProperties: false,
          properties: {
            zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            confidence: { type: 'number' },
          },
          required: ['zh', 'en', 'confidence'],
        },
        author: {
          type: 'object',
          additionalProperties: false,
          properties: {
            zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            confidence: { type: 'number' },
          },
          required: ['zh', 'en', 'confidence'],
        },
        publisher: {
          type: 'object',
          additionalProperties: false,
          properties: {
            zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            confidence: { type: 'number' },
          },
          required: ['zh', 'en', 'confidence'],
        },
        other_text: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'author', 'publisher', 'other_text'],
    },
    visual_elements: {
      type: 'object',
      additionalProperties: false,
      properties: {
        has_cover_image: { type: 'boolean' },
        image_quality_score: { type: 'number' },
        notable_elements: { type: 'array', items: { type: 'string' } },
      },
      required: ['has_cover_image', 'image_quality_score', 'notable_elements'],
    },
  },
  required: ['confidence_scores', 'language_detection', 'extracted_text', 'visual_elements'],
}

// Item analysis schema
export const itemAnalysisSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    name: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    type: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    material: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    finish: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    size: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    dimensions: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    category_suggestion: {
      anyOf: [
        { type: 'string', enum: ['DHARMA_ITEMS', 'BUDDHA_STATUES'] },
        { type: 'null' },
      ],
    },
    tags: { type: 'array', items: { type: 'string' } },
    quality_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'type', 'material', 'finish', 'size', 'dimensions', 'category_suggestion', 'tags', 'quality_issues'],
}

// Visual similarity schema
export const visualSimilaritySchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    layout_similarity: { type: 'number' },
    content_similarity: { type: 'number' },
    confidence: { type: 'number' },
  },
  required: ['layout_similarity', 'content_similarity', 'confidence'],
}
