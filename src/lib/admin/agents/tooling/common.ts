import { z } from 'zod'
import { tool, type Tool } from '@openai/agents-core'
import type { RunContext } from '@openai/agents-core'
import { HttpUrl } from '@/lib/schema/http-url'
import { getToolCallsCache } from '@/lib/runtime/request-context'
import { checkDuplicates } from '@/lib/admin/services/duplicates'

// Agent context shared by all tools
export type AgentContext = {
  userEmail: string
  uiLanguage?: import('@/lib/admin/i18n').UILanguage
}

// Stable stringify to deduplicate per-request tool calls by arguments
export function stableStringify(value: unknown): string {
  const seen = new WeakSet()
  const helper = (v: any): any => {
    if (v === null || typeof v !== 'object') return v
    if (seen.has(v)) return '[circular]'
    seen.add(v)
    if (Array.isArray(v)) return v.map((x) => helper(x))
    const keys = Object.keys(v).sort()
    const out: Record<string, unknown> = {}
    for (const k of keys) out[k] = helper(v[k])
    return out
  }
  return JSON.stringify(helper(value))
}

export function shouldSkipDuplicateCall(toolName: string, args: unknown): boolean {
  const cache = getToolCallsCache()
  if (!cache) return false
  const key = `${toolName}:${stableStringify(args)}`
  if (cache.has(key)) return true
  cache.add(key)
  return false
}

export function buildCheckDuplicatesTool(): Tool<AgentContext> {
  return tool({
    name: 'check_duplicates',
    description: 'Check for duplicate books or items based on extracted fields and optional cover image. Provide either book fields (title/author/publisher) or item fields (name/type/tags).',
    strict: true,
    parameters: z.object({
      // Book-style fields (optional)
      title_zh: z.string().nullable().optional(),
      title_en: z.string().nullable().optional(),
      author_zh: z.string().nullable().optional(),
      author_en: z.string().nullable().optional(),
      publisher_zh: z.string().nullable().optional(),
      publisher_en: z.string().nullable().optional(),
      // Item-style fields (optional)
      item_name_zh: z.string().nullable().optional(),
      item_name_en: z.string().nullable().optional(),
      item_type_zh: z.string().nullable().optional(),
      item_type_en: z.string().nullable().optional(),
      tags: z.array(z.string()).nullable().optional(),
      // Optional category hint
      category_type: z.enum(['PURE_LAND_BOOKS', 'OTHER_BOOKS', 'DHARMA_ITEMS', 'BUDDHA_STATUES']).nullable().optional(),
      // Visual input
      cover_image: HttpUrl.nullable().optional(),
    }).strict(),
    async execute(input: unknown, context?: RunContext<AgentContext>) {
      const email = context?.context?.userEmail || 'admin@unknown'
      const result = await checkDuplicates(input as any, email)
      return result
    },
  })
}

