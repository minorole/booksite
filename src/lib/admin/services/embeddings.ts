import { createTextEmbedding } from '@/lib/openai/embeddings'
import { upsertBookTextEmbedding, getBooksMissingEmbeddings } from '@/lib/db/admin/embeddings'
import { handleOperationError } from './utils'

function buildTextForEmbedding(input: {
  title_zh?: string | null
  title_en?: string | null
  author_zh?: string | null
  author_en?: string | null
  publisher_zh?: string | null
  publisher_en?: string | null
}): string {
  const fields: string[] = []
  if (input.title_zh) fields.push(input.title_zh)
  if (input.title_en) fields.push(input.title_en)
  if (input.author_zh) fields.push(input.author_zh)
  if (input.author_en) fields.push(input.author_en)
  if (input.publisher_zh) fields.push(input.publisher_zh)
  if (input.publisher_en) fields.push(input.publisher_en)
  return fields.join(' \n ')
}

export async function backfillMissingTextEmbeddings(limit = 100, batchSize = 10): Promise<{ processed: number; created: number; errors: number } | { success: false; message: string; error: any } > {
  try {
    const rows = await getBooksMissingEmbeddings(limit)
    let processed = 0
    let created = 0
    let errors = 0
    for (let i = 0; i < rows.length; i += batchSize) {
      const slice = rows.slice(i, i + batchSize)
      await Promise.all(
        slice.map(async (r) => {
          try {
            const text = buildTextForEmbedding(r)
            if (!text.trim()) { processed++; return }
            const vec = await createTextEmbedding(text)
            await upsertBookTextEmbedding(r.id, vec)
            processed++; created++
          } catch {
            processed++; errors++
          }
        })
      )
    }
    return { processed, created, errors }
  } catch (error) {
    return handleOperationError(error, 'backfill text embeddings') as any
  }
}

export function buildQueryTextForEmbedding(input: {
  title_zh?: string | null
  title_en?: string | null
  author_zh?: string | null
  author_en?: string | null
  publisher_zh?: string | null
  publisher_en?: string | null
  tags?: string[] | null
}): string {
  const base = buildTextForEmbedding(input)
  const tagsPart = Array.isArray(input.tags) && input.tags.length > 0 ? `\n tags: ${input.tags.join(', ')}` : ''
  return `${base}${tagsPart}`
}

