"use client";

import { Bilingual } from '@/components/common/bilingual'

type SummaryBook = { id?: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[]; category_type?: string }

export function BookSummaryCard({ data, mode }: { data: { book?: SummaryBook } | null; mode: 'created' | 'updated' }) {
  const book = data?.book
  if (!book) return <p className="text-sm text-muted-foreground"><Bilingual cnText="无书籍详情。" enText="No book details." /></p>
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{mode === 'updated' ? <Bilingual cnText="书籍已更新" enText="Book updated" /> : <Bilingual cnText="书籍已创建" enText="Book created" />}</h3>
      <div className="rounded border bg-background p-3">
        <div className="font-medium">{book.title_en || book.title_zh || 'Untitled'}</div>
        <div className="text-xs text-muted-foreground mt-1 flex gap-2">
          {book.quantity !== undefined && <span><Bilingual cnText="数量" enText="Qty" />: {book.quantity}</span>}
          {book.category_type && <span><Bilingual cnText="分类" enText="Category" />: {book.category_type}</span>}
        </div>
        {Array.isArray(book.tags) && book.tags.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1"><Bilingual cnText="标签" enText="Tags" />: {book.tags.slice(0, 5).join(', ')}</div>
        )}
      </div>
    </div>
  )
}
