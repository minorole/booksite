import { z } from 'zod'
import { tool, type Tool } from '@openai/agents-core'
import type { RunContext } from '@openai/agents-core'
import { analyzeBookCover, analyzeItemPhoto } from '@/lib/admin/services/vision'
import { checkDuplicates } from '@/lib/admin/services/duplicates'
import { createBook, updateBook, searchBooks, adjustBookQuantity } from '@/lib/admin/services/books'
import { updateOrder } from '@/lib/admin/services/orders'
import { getOrderDb, searchOrdersDb } from '@/lib/db/admin'
import { HttpUrl } from '@/lib/schema/http-url'
import { VisionAnalysisResultZ } from '@/lib/admin/types/vision.zod'

// Agent context
export type AgentContext = {
  userEmail: string
  uiLanguage?: import('@/lib/admin/i18n').UILanguage
}

function buildCheckDuplicatesTool(): Tool<AgentContext> {
  return tool({
    name: 'check_duplicates',
    description: 'Check for duplicate books or items based on extracted fields and optional cover image. Provide either book fields (title/author/publisher) or item fields (name/type/tags).',
    strict: true,
    parameters: z.object({
      // Book-style fields (optional)
      title_zh: z.string().nullable(),
      title_en: z.string().nullable(),
      author_zh: z.string().nullable(),
      author_en: z.string().nullable(),
      publisher_zh: z.string().nullable(),
      publisher_en: z.string().nullable(),
      // Item-style fields (optional)
      item_name_zh: z.string().nullable(),
      item_name_en: z.string().nullable(),
      item_type_zh: z.string().nullable(),
      item_type_en: z.string().nullable(),
      tags: z.array(z.string()).nullable(),
      // Optional category hint
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']).nullable(),
      // Visual input
      cover_image: HttpUrl.nullable(),
    }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const result = await checkDuplicates(input as any, email)
      return result
    },
  })
}

export function visionTools(): Tool<AgentContext>[] {
  const analyze = tool({
    name: 'analyze_book_cover',
    description:
      'Analyze a book cover image. For initial analysis, produce a natural summary and tentative fields; for structured stage, return the VisionAnalysisResult JSON.',
    strict: true,
    parameters: z.object({
      image_url: HttpUrl,
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
    }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const result = await analyzeBookCover(input as import('@/lib/admin/types').BookAnalyzeParams, email)
      return result
    },
  })

  const dup = buildCheckDuplicatesTool()

  const analyzeItem = tool({
    name: 'analyze_item_photo',
    description: 'Analyze a non-book item photo and return structured fields (name/type, material/finish, size/dimensions, category suggestion, tags).',
    strict: true,
    parameters: z.object({
      image_url: HttpUrl,
    }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const { image_url } = input as { image_url: string }
      const result = await analyzeItemPhoto(image_url, email)
      return result
    },
  })

  return [analyze, dup, analyzeItem]
}

export function inventoryTools(): Tool<AgentContext>[] {
  const dup = buildCheckDuplicatesTool()
  const create = tool({
    name: 'create_book',
    description: 'Create a new book listing with initial quantity and tags.',
    strict: true,
    parameters: z.object({
      confirmed: z.boolean(),
      title_zh: z.string(),
      title_en: z.string().nullable(),
      description_zh: z.string(),
      description_en: z.string().nullable(),
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']),
      quantity: z.number().int().min(0),
      tags: z.array(z.string()),
      // Accept either cover_image or cover_url; map to cover_image in execute
      cover_image: HttpUrl.nullable(),
      cover_url: HttpUrl.nullable(),
      author_zh: z.string().nullable(),
      author_en: z.string().nullable(),
      publisher_zh: z.string().nullable(),
      publisher_en: z.string().nullable(),
      // Optional vision analysis payload passthrough (strictly typed)
      analysis_result: VisionAnalysisResultZ.nullable(),
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
      title_zh: z.string().nullable(),
      title_en: z.string().nullable(),
      description_zh: z.string().nullable(),
      description_en: z.string().nullable(),
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']).nullable(),
      quantity: z.number().int().min(0).nullable(),
      tags: z.array(z.string()).nullable(),
      cover_image: HttpUrl.nullable(),
      cover_url: HttpUrl.nullable(),
      author_zh: z.string().nullable(),
      author_en: z.string().nullable(),
      publisher_zh: z.string().nullable(),
      publisher_en: z.string().nullable(),
      // Allow attaching updated analysis data (strictly typed)
      analysis_result: VisionAnalysisResultZ.nullable(),
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
    parameters: z.object({
      book_id: z.string(),
      delta: z.number().int(),
    }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const { book_id, delta } = input as { book_id: string; delta: number }
      const result = await adjustBookQuantity({ book_id, delta }, email)
      return result
    },
  })

  return [create, update, search, adjust, dup]
}

export function orderTools(): Tool<AgentContext>[] {
  const update = tool({
    name: 'update_order',
    description: 'Update an order with shipping info or status.',
    strict: true,
    parameters: z.object({
      confirmed: z.boolean(),
      order_id: z.string(),
      status: z.string().nullable(),
      tracking_number: z.string().nullable(),
      admin_notes: z.string().nullable(),
      override_monthly: z.boolean().nullable(),
    }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const pruned: Record<string, unknown> = {}
      if (typeof input === 'object' && input !== null) {
        const obj = input as Record<string, unknown>
        if (!obj.confirmed) {
          return { success: false, message: 'Confirmation required', error: { code: 'confirmation_required', details: 'update_order' } }
        }
        for (const [k, v] of Object.entries(obj)) {
          if (v !== null && v !== undefined) pruned[k] = v
        }
      }
      delete pruned.confirmed
      const result = await updateOrder(pruned as unknown as import('@/lib/admin/types').OrderUpdate, email)
      return result
    },
  })

  const getOrder = tool({
    name: 'get_order',
    description: 'Fetch a single order by ID.',
    strict: true,
    parameters: z.object({ order_id: z.string() }).strict(),
    async execute(input: unknown) {
      const { order_id } = input as { order_id: string }
      const o = await getOrderDb(order_id)
      if (!o) return { success: false, message: 'Order not found' }
      return { success: true, message: 'Order found', data: { order: { order_id: o.order_id, status: o.status, tracking_number: o.tracking_number ?? undefined } } }
    },
  })

  const searchOrders = tool({
    name: 'search_orders',
    description: 'Search orders by status or query string (id or tracking number).',
    strict: true,
    parameters: z.object({ status: z.string().nullable(), q: z.string().nullable() }).strict(),
    async execute(input: unknown) {
      const { status, q } = input as { status?: string | null; q?: string | null }
      const rows = await searchOrdersDb({ status: status ?? undefined, q: q ?? undefined })
      return { success: true, message: `Found ${rows.length} order(s)`, data: { orders: rows } }
    },
  })

  return [update, getOrder, searchOrders]
}

// Compatibility: Some tests reference a helper to fetch tools for an agent by id.
export function getToolsForAgent(agentId: 'router' | 'vision' | 'inventory' | 'orders'): Tool<AgentContext>[] {
  if (agentId === 'vision') return visionTools()
  if (agentId === 'inventory') return inventoryTools()
  if (agentId === 'orders') return orderTools()
  // Router intentionally has no domain tools to force handoffs
  return []
}

// Derive first-party tool names from our tool factories at runtime with memoization.
let DOMAIN_TOOL_NAMES_CACHE: Set<string> | null = null
export function getDomainToolNames(): Set<string> {
  if (DOMAIN_TOOL_NAMES_CACHE) return DOMAIN_TOOL_NAMES_CACHE
  const all = [
    ...visionTools(),
    ...inventoryTools(),
    ...orderTools(),
  ] as Array<{ name?: string }>
  DOMAIN_TOOL_NAMES_CACHE = new Set(
    all.map((t) => t?.name).filter((n): n is string => typeof n === 'string' && n.length > 0)
  )
  return DOMAIN_TOOL_NAMES_CACHE
}

// (Removed unused snapshot export of tool names)
