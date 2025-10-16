export function visionStructuredResponseFormat(name: string, schema: Record<string, any>) {
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
export const initialCoverAnalysisSchema: Record<string, any> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    title_zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    title_en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    author_zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    author_en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    publisher_zh: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    publisher_en: { anyOf: [{ type: 'string' }, { type: 'null' }] },
    category_suggestion: {
      anyOf: [
        { type: 'string', enum: ['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES'] },
        { type: 'null' },
      ],
    },
    quality_issues: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'summary',
    'title_zh',
    'title_en',
    'author_zh',
    'author_en',
    'publisher_zh',
    'publisher_en',
    'category_suggestion',
    'quality_issues',
  ],
}

// Cover analysis — structured (VisionAnalysisResult)
export const structuredVisionAnalysisSchema: Record<string, any> = {
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
export const itemAnalysisSchema: Record<string, any> = {
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
export const visualSimilaritySchema: Record<string, any> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    layout_similarity: { type: 'number' },
    content_similarity: { type: 'number' },
    confidence: { type: 'number' },
  },
  required: ['layout_similarity', 'content_similarity', 'confidence'],
}

