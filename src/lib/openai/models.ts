import { OPENAI_CONFIG } from './config';

export function getModel(kind: 'text' | 'vision'): string {
  if (kind === 'text') {
    const t = process.env.OPENAI_TEXT_MODEL?.trim();
    return t ? t : OPENAI_CONFIG.MODELS.GPT5_MINI;
  }
  const v = process.env.OPENAI_VISION_MODEL?.trim();
  return v ? v : OPENAI_CONFIG.MODELS.VISION_DEFAULT;
}

export function getEmbeddingModel(): string {
  const m = process.env.OPENAI_EMBEDDINGS_MODEL?.trim();
  // Default to cost-effective 1536-dim model
  return m ? m : 'text-embedding-3-small';
}
