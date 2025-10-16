import { z } from 'zod'
import { tool, type Tool } from '@openai/agents-core'
import type { RunContext } from '@openai/agents-core'
import {
  analyzeBookCover,
  analyzeItemPhoto,
} from '@/lib/admin/services/vision'
import { checkDuplicates } from '@/lib/admin/services/duplicates'
import { createBook, updateBook, searchBooks } from '@/lib/admin/services/books'
import { updateOrder } from '@/lib/admin/services/orders'
import { getOrderDb, searchOrdersDb } from '@/lib/db/admin'

// Agent context
export type AgentContext = {
  userEmail: string
}

export function visionTools(): Tool<AgentContext>[] {
  const analyze = tool({
    name: 'analyze_book_cover',
    description:
      'Analyze a book cover image. For initial analysis, produce a natural summary and tentative fields; for structured stage, return the VisionAnalysisResult JSON.',
    strict: true,
    parameters: z.object({
      image_url: z.string().url(),
      stage: z.enum(['initial', 'structured']),
      confirmed_info: z
        .object({
          title_zh: z.string().nullable(),
          title_en: z.string().nullable(),
          author_zh: z.string().nullable(),
          author_en: z.string().nullable(),
          publisher_zh: z.string().nullable(),
          publisher_en: z.string().nullable(),
          category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']).nullable(),
        })
        .nullable(),
    }),
    async execute(input: any, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const result = await analyzeBookCover(input, email)
      return result
    },
  })

  const dup = tool({
    name: 'check_duplicates',
    description: 'Check for duplicate books based on extracted fields and optional cover image.',
    strict: true,
    parameters: z.object({
      title_zh: z.string(),
      title_en: z.string().nullable(),
      author_zh: z.string().nullable(),
      author_en: z.string().nullable(),
      publisher_zh: z.string().nullable(),
      publisher_en: z.string().nullable(),
      cover_image: z.string().url().nullable(),
    }),
    async execute(input: any, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const result = await checkDuplicates(input, email)
      return result
    },
  })

  const analyzeItem = tool({
    name: 'analyze_item_photo',
    description: 'Analyze a non-book item photo and return structured fields (name/type, material/finish, size/dimensions, category suggestion, tags).',
    strict: true,
    parameters: z.object({
      image_url: z.string().url(),
    }),
    async execute(input: any, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const result = await analyzeItemPhoto(input.image_url, email)
      return result
    },
  })

  return [analyze, dup, analyzeItem]
}

export function inventoryTools(): Tool<AgentContext>[] {
  const create = tool({
    name: 'create_book',
    description: 'Create a new book listing with initial quantity and tags.',
    strict: true,
    parameters: z.object({
      title_zh: z.string(),
      title_en: z.string().nullable(),
      description_zh: z.string(),
      description_en: z.string().nullable(),
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']),
      quantity: z.number().int().min(0),
      tags: z.array(z.string()),
      cover_image: z.string().url(),
      author_zh: z.string().nullable(),
      author_en: z.string().nullable(),
      publisher_zh: z.string().nullable(),
      publisher_en: z.string().nullable(),
    }),
    async execute(input: any, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const result = await createBook(input, email)
      return result
    },
  })

  const update = tool({
    name: 'update_book',
    description: 'Update fields of an existing book listing.',
    strict: true,
    parameters: z.object({
      book_id: z.string(),
      title_zh: z.string().nullable(),
      title_en: z.string().nullable(),
      description_zh: z.string().nullable(),
      description_en: z.string().nullable(),
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']).nullable(),
      quantity: z.number().int().min(0).nullable(),
      tags: z.array(z.string()).nullable(),
    }),
    async execute(input: any, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      // convert nulls to undefined for partial updates
      const sanitized: Record<string, any> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== null && v !== undefined) sanitized[k] = v
      }
      const result = await updateBook(sanitized as any, email)
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
    }),
    async execute(input: any) {
      const pruned: Record<string, any> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== null && v !== undefined) pruned[k] = v
      }
      const result = await searchBooks(pruned as any)
      return result
    },
  })

  return [create, update, search]
}

export function orderTools(): Tool<AgentContext>[] {
  const update = tool({
    name: 'update_order',
    description: 'Update an order with shipping info or status.',
    strict: true,
    parameters: z.object({
      order_id: z.string(),
      status: z.string().nullable(),
      tracking_number: z.string().nullable(),
      shipped_at: z.string().nullable(),
    }),
    async execute(input: any, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const pruned: Record<string, any> = {}
      for (const [k, v] of Object.entries(input)) {
        if (v !== null && v !== undefined) pruned[k] = v
      }
      const result = await updateOrder(pruned as any, email)
      return result
    },
  })

  const getOrder = tool({
    name: 'get_order',
    description: 'Fetch a single order by ID.',
    strict: true,
    parameters: z.object({ order_id: z.string() }),
    async execute(input: any) {
      const o = await getOrderDb(input.order_id)
      if (!o) return { success: false, message: 'Order not found' }
      return { success: true, message: 'Order found', data: { order: { order_id: o.order_id, status: o.status, tracking_number: o.tracking_number ?? undefined } } }
    },
  })

  const searchOrders = tool({
    name: 'search_orders',
    description: 'Search orders by status or query string (id or tracking number).',
    strict: true,
    parameters: z.object({ status: z.string().nullable(), q: z.string().nullable() }),
    async execute(input: any) {
      const rows = await searchOrdersDb({ status: input.status ?? undefined, q: input.q ?? undefined })
      return { success: true, message: `Found ${rows.length} order(s)`, data: { orders: rows } }
    },
  })

  return [update, getOrder, searchOrders]
}

export function getToolsForAgent(agentId: 'router' | 'vision' | 'inventory' | 'orders'): Tool<AgentContext>[] {
  if (agentId === 'vision') return visionTools()
  if (agentId === 'inventory') return inventoryTools()
  if (agentId === 'orders') return orderTools()
  // Router intentionally has no domain tools to force handoffs
  return []
}
