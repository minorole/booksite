export type Category = {
  id: string
  type: import('@/lib/db/enums').CategoryType
  name_zh: string
  name_en: string
  description_zh: string | null
  description_en: string | null
}

export type Book = {
  id: string
  title_zh: string
  title_en: string | null
  description_zh: string
  description_en: string | null
  cover_image: string | null
  quantity: number
  search_tags: string[]
  category: Category
}

export async function listBooksApi(): Promise<Book[]> {
  const resp = await fetch('/api/admin/manual/books')
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to fetch books')
  return (data.books || []) as Book[]
}

export async function updateBookApi(id: string, payload: Record<string, unknown>): Promise<void> {
  const resp = await fetch(`/api/admin/manual/books/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to update book')
}

export async function deleteBookApi(id: string): Promise<void> {
  const resp = await fetch(`/api/admin/manual/books/${id}`, { method: 'DELETE' })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok || data?.error) throw new Error(data?.error || 'Failed to delete book')
}

