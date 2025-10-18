"use client";

import Image from 'next/image'
import type { DuplicateDetectionResult } from '@/lib/admin/types/results'
import { Button } from '@/components/ui/button'
import { Bilingual } from '@/components/common/bilingual'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/contexts/LocaleContext'

type BookItem = { id: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[] }

export function DuplicateMatchesCard({ data }: { data: { duplicate_detection?: DuplicateDetectionResult; search?: { books: BookItem[] } } | null }) {
  const router = useRouter()
  const { locale } = useLocale()
  const dd = data?.duplicate_detection
  if (!dd) return <p className="text-sm text-muted-foreground"><Bilingual cnText="未检测到重复。" enText="No duplicates detected." /></p>
  const rec = dd.analysis?.recommendation
  const matches = dd.matches || []
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold"><Bilingual cnText="可能的重复项" enText="Duplicate candidates" /></h3>
        {rec && <span className="text-xs rounded px-2 py-0.5 bg-blue-100 text-blue-700">{rec}</span>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {matches.slice(0, 6).map((m, i) => {
          const score = Math.round((m.similarity_score || 0) * 100)
          return (
            <div key={i} className="rounded border bg-background p-2">
              <div className="flex items-start gap-2">
                <div className="h-16 w-12 bg-muted rounded overflow-hidden" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Book #{m.book_id.slice(0, 8)}</div>
                    <div className="text-xs">{score}%</div>
                  </div>
                  <div className="mt-1 h-1.5 bg-muted rounded">
                    <div className="h-1.5 bg-blue-500 rounded" style={{ width: `${score}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { router.push(`/${locale}/admin/manual?bookId=${m.book_id}`) }}>
                  <Bilingual cnText="打开编辑器" enText="Open in editor" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
