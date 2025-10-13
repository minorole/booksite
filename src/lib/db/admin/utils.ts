import { getServerDb } from '@/lib/db/client'
import type { CategoryType } from '@/lib/db/enums'

// Helper to resolve category id by type
export async function resolveCategoryId(categoryType: CategoryType | undefined): Promise<string | undefined> {
  if (!categoryType) return undefined
  const db = await getServerDb()
  const { data, error } = await db
    .from('categories')
    .select('id, type')
    .eq('type', categoryType)
    .maybeSingle()
  if (error || !data) return undefined
  return (data as any).id as string
}

