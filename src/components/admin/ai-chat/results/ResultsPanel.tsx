"use client";

import { useResultsStore } from '../state/useResultsStore'
import type { DuplicateDetectionResult } from '@/lib/admin/types/results'
import { DuplicateMatchesCard } from './cards/DuplicateMatchesCard'
import { SearchResultsList } from './cards/SearchResultsList'
import { BookSummaryCard } from './cards/BookSummaryCard'
import { OrderUpdateCard } from './cards/OrderUpdateCard'

export function ResultsPanel() {
  const { panel, payload, toolName, requestId } = useResultsStore()

  return (
    <div className="h-full border-l bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Results</span>
        {requestId && (
          <button
            className="rounded px-2 py-0.5 hover:bg-muted"
            onClick={() => navigator.clipboard.writeText(requestId)}
            title="Copy request id"
          >
            req: {requestId.slice(0, 8)}
          </button>
        )}
      </div>
      <div className="overflow-y-auto max-h-[calc(100vh-16rem)] pr-1">
        {panel === 'duplicates' && (
          <DuplicateMatchesCard data={payload as { duplicate_detection?: DuplicateDetectionResult; search?: { books: Array<{ id: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[] }> } } | null} />
        )}
        {panel === 'search' && (
          <SearchResultsList data={payload as { search?: { books: Array<{ id: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[] }> } } | null} />
        )}
        {panel === 'book' && (
          <BookSummaryCard data={payload as { book?: { id?: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[]; category_type?: string } } | null} mode={toolName === 'update_book' ? 'updated' : 'created'} />
        )}
        {panel === 'order' && (
          <OrderUpdateCard data={payload as { order?: { order_id: string; status?: string | null; tracking_number?: string | null } } | null} />
        )}
        {!panel && (
          <p className="text-sm text-muted-foreground">
            When a tool produces results, you’ll see a detailed view here.
          </p>
        )}
      </div>
    </div>
  )
}
