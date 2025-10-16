"use client";

import { Check, Loader2, TriangleAlert } from 'lucide-react'

type Step = {
  id: string
  name: string
  status: 'running' | 'done' | 'error'
  summary?: string
}

const LABELS: Record<string, string> = {
  analyze_book_cover: 'Analyzing cover',
  check_duplicates: 'Checking duplicates',
  create_book: 'Creating book',
  update_book: 'Updating book',
  search_books: 'Searching books',
  update_order: 'Updating order',
}

export function StepList({ steps }: { steps: Step[] }) {
  if (!steps.length) return null
  return (
    <div className="px-4 pb-2 flex flex-wrap gap-2">
      {steps.map((s) => (
        <div key={s.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm bg-muted">
          {s.status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {s.status === 'done' && <Check className="h-3.5 w-3.5 text-green-600" />}
          {s.status === 'error' && <TriangleAlert className="h-3.5 w-3.5 text-red-600" />}
          <span>{
            LABELS[s.name] || (s.name.startsWith('handoff:') ? `Handoff to ${s.name.slice(8)}` : s.name)
          }</span>
        </div>
      ))}
    </div>
  )
}

export type { Step }
