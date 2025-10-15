"use client";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { CategoryType } from '@/lib/db/enums'
import { CATEGORY_LABELS } from '@/lib/admin/constants'

export function AnalysisConfirmation({
  analysis,
  onConfirm,
  onEdit,
  loading,
}: {
  analysis: {
    title_zh?: string
    title_en?: string | null
    author_zh?: string | null
    author_en?: string | null
    publisher_zh?: string | null
    publisher_en?: string | null
    category_type?: CategoryType
    quality_issues?: string[]
  }
  onConfirm: () => void
  onEdit: () => void
  loading: boolean
}) {
  const ct = analysis.category_type
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-lg bg-background/50 p-4 space-y-2">
        <h4 className="font-medium">Please confirm the information:</h4>
        <div className="space-y-1 text-sm">
          {analysis.title_zh && <p>Title (Chinese): {analysis.title_zh}</p>}
          {analysis.title_en && <p>Title (English): {analysis.title_en}</p>}
          {analysis.author_zh && <p>Author (Chinese): {analysis.author_zh}</p>}
          {analysis.author_en && <p>Author (English): {analysis.author_en}</p>}
          {analysis.publisher_zh && <p>Publisher (Chinese): {analysis.publisher_zh}</p>}
          {analysis.publisher_en && <p>Publisher (English): {analysis.publisher_en}</p>}
          {ct && (
            <p>
              Category: {ct} ({CATEGORY_LABELS[ct as CategoryType]})
            </p>
          )}
          {analysis.quality_issues?.length ? (
            <div className="mt-2">
              <p className="font-medium">Quality Issues:</p>
              <ul className="list-disc list-inside">
                {analysis.quality_issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onConfirm} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
        </Button>
        <Button variant="outline" onClick={onEdit} disabled={loading}>
          Edit
        </Button>
      </div>
    </div>
  )
}
