"use client";

type BookItem = { id: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[] }

export function SearchResultsList({ data }: { data: { search?: { books: BookItem[] } } | null }) {
  const books = data?.search?.books || []
  if (!books.length) return <p className="text-sm text-muted-foreground">No results.</p>
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Search results</h3>
      <ul className="space-y-2">
        {books.slice(0, 10).map((b) => (
          <li key={b.id} className="rounded border bg-background p-2">
            <div className="text-sm font-medium">{b.title_en || b.title_zh || 'Untitled'}</div>
            <div className="text-xs text-muted-foreground flex gap-2 mt-1">
              {b.quantity !== undefined && <span>Qty: {b.quantity}</span>}
              {Array.isArray(b.tags) && b.tags.length > 0 && <span>Tags: {b.tags.slice(0, 3).join(', ')}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
