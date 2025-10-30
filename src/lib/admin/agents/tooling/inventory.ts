import { z } from 'zod'
import { tool, type Tool } from '@openai/agents-core'
import type { RunContext } from '@openai/agents-core'
import { HttpUrl } from '@/lib/schema/http-url'
import { VisionAnalysisResultZ } from '@/lib/admin/types/vision.zod'
import { createBook, updateBook, searchBooks, adjustBookQuantity } from '@/lib/admin/services/books'
import type { AgentContext } from './common'
import { buildCheckDuplicatesTool } from './common'

export function inventoryTools(): Tool<AgentContext>[] {
  const dup = buildCheckDuplicatesTool()

  const create = tool({
    name: 'create_book',
    description: 'Create a new book listing with initial quantity and tags.',
    strict: true,
    parameters: z.object({
      confirmed: z.boolean(),
      title_zh: z.string(),
      title_en: z.string().nullable().optional(),
      description_zh: z.string(),
      description_en: z.string().nullable().optional(),
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']),
      quantity: z.number().int().min(0),
      tags: z.array(z.string()),
      // Accept either cover_image or cover_url; map to cover_image in execute
      cover_image: HttpUrl.nullable().optional(),
      cover_url: HttpUrl.nullable().optional(),
      author_zh: z.string().nullable().optional(),
      author_en: z.string().nullable().optional(),
      publisher_zh: z.string().nullable().optional(),
      publisher_en: z.string().nullable().optional(),
      // Optional vision analysis payload passthrough (strictly typed)
      analysis_result: VisionAnalysisResultZ.nullable().optional(),
    }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const payload = input as Record<string, unknown>
      if (!payload.confirmed) {
        return { success: false, message: 'Confirmation required', error: { code: 'confirmation_required', details: 'create_book' } }
      }
      // Remove guard param before calling service
      const { confirmed: _c, ...rest } = payload
      const mapped: Record<string, unknown> = { ...rest }
      if (!mapped.cover_image && !mapped.cover_url) {
        return { success: false, message: 'cover image required', error: { code: 'validation_error', details: 'missing_cover' } }
      }
      if (!mapped.cover_image && typeof mapped.cover_url === 'string') {
        mapped.cover_image = mapped.cover_url
      }
      delete mapped.cover_url
      const result = await createBook(mapped as unknown as import('@/lib/admin/types').BookCreate, email)
      return result
    },
  })

  const update = tool({
    name: 'update_book',
    description: 'Update fields of an existing book listing.',
    strict: true,
    parameters: z.object({
      confirmed: z.boolean(),
      book_id: z.string(),
      title_zh: z.string().nullable().optional(),
      title_en: z.string().nullable().optional(),
      description_zh: z.string().nullable().optional(),
      description_en: z.string().nullable().optional(),
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']).nullable().optional(),
      quantity: z.number().int().min(0).nullable().optional(),
      tags: z.array(z.string()).nullable().optional(),
      cover_image: HttpUrl.nullable().optional(),
      cover_url: HttpUrl.nullable().optional(),
      author_zh: z.string().nullable().optional(),
      author_en: z.string().nullable().optional(),
      publisher_zh: z.string().nullable().optional(),
      publisher_en: z.string().nullable().optional(),
      // Allow attaching updated analysis data (strictly typed)
      analysis_result: VisionAnalysisResultZ.nullable().optional(),
    }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      // convert nulls to undefined for partial updates
      const sanitized: Record<string, unknown> = {}
      if (typeof input === 'object' && input !== null) {
        const obj = input as Record<string, unknown>
        if (!obj.confirmed) {
          return { success: false, message: 'Confirmation required', error: { code: 'confirmation_required', details: 'update_book' } }
        }
        for (const [k, v] of Object.entries(obj)) {
          if (v !== null && v !== undefined) sanitized[k] = v
        }
      }
      delete sanitized.confirmed
      if (!('cover_image' in sanitized) && typeof (sanitized as any).cover_url === 'string') {
        sanitized.cover_image = (sanitized as any).cover_url
      }
      delete (sanitized as any).cover_url
      const result = await updateBook(sanitized as unknown as import('@/lib/admin/types').BookUpdate, email)
      return result
    },
  })

  const search = tool({
    name: 'search_books',
    description: 'Search for books based on title, tags, category, and quantity range.',
    strict: true,
    parameters: z.object({
      title: z.string().nullable(),
      tags: z.array(z.string()).nullable(),
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']).nullable(),
      min_quantity: z.number().int().nullable(),
      max_quantity: z.number().int().nullable(),
    }).strict(),
    async execute(input: unknown) {
      const pruned: Record<string, unknown> = {}
      if (typeof input === 'object' && input !== null) {
        for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
          if (v !== null && v !== undefined) pruned[k] = v
        }
      }
      const result = await searchBooks(pruned as import('@/lib/admin/types').BookSearch)
      return result
    },
  })

  const adjust = tool({
    name: 'adjust_book_quantity',
    description: 'Increase or decrease the quantity of an existing book by a delta. Ensures non-negative results.',
    strict: true,
    parameters: z.object({ book_id: z.string(), delta: z.number().int() }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const { book_id, delta } = input as { book_id: string; delta: number }
      const result = await adjustBookQuantity({ book_id, delta }, email)
      return result
    },
  })

  return [create, update, search, adjust, dup]
}

