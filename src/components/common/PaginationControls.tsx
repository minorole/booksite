"use client"

import { Button } from '@/components/ui/button'

export function PaginationControls({
  page,
  limit,
  total,
  onPrev,
  onNext,
  disableNext,
  children,
}: {
  page: number
  limit: number
  total?: number
  onPrev: () => void
  onNext: () => void
  disableNext?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        {typeof total === 'number' ? (
          <>Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}</>
        ) : (
          <>Page {page + 1}</>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={onPrev}>Previous</Button>
        <Button variant="outline" size="sm" disabled={!!disableNext} onClick={onNext}>Next</Button>
      </div>
    </div>
  )
}

