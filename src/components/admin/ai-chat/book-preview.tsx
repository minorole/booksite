"use client"

import { BookData } from "@/types/admin/chat"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface DuplicateCheck {
  confidence: number
  reasons: string[]
}

interface AIMetadata {
  duplicate_check?: DuplicateCheck
  [key: string]: any
}

export interface BookPreviewProps {
  book: BookData & {
    ai_metadata?: AIMetadata
  }
  showDuplicateInfo?: boolean
  onUpdateQuantity?: (quantity: number) => void
  onUpdateCategory?: (categoryType: string) => void
  onUpdateTags?: (tags: string[]) => void
}

export function BookPreview({ 
  book,
  showDuplicateInfo,
  onUpdateQuantity,
  onUpdateCategory,
  onUpdateTags
}: BookPreviewProps) {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex gap-4">
        {/* Book Cover */}
        {book.cover_image && (
          <div className="relative w-24 h-32 flex-shrink-0">
            <Image
              src={book.cover_image}
              alt={book.title_en || book.title_zh || 'Book cover'}
              fill
              className="object-cover rounded"
            />
          </div>
        )}
        
        {/* Book Info */}
        <div className="space-y-2 flex-1">
          {/* Titles */}
          <div>
            {book.title_zh && (
              <h3 className="font-medium">{book.title_zh}</h3>
            )}
            {book.title_en && (
              <h4 className="text-sm text-muted-foreground">{book.title_en}</h4>
            )}
          </div>

          {/* Category and Quantity */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {book.category.name_zh} / {book.category.name_en}
            </Badge>
            <span className="text-sm">
              Quantity: {book.quantity}
            </span>
          </div>

          {/* Discontinued Status */}
          {book.discontinued && (
            <Badge variant="destructive">Discontinued</Badge>
          )}
        </div>
      </div>

      {/* Tags */}
      {book.search_tags && book.search_tags.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium">Tags:</p>
          <div className="flex flex-wrap gap-1">
            {book.search_tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Info */}
      {showDuplicateInfo && book.ai_metadata?.duplicate_check && (
        <div className="space-y-1 text-sm">
          <p className="font-medium">Duplicate Analysis:</p>
          <div className="text-muted-foreground">
            <p>Confidence: {Math.round(book.ai_metadata.duplicate_check.confidence * 100)}%</p>
            {book.ai_metadata.duplicate_check.reasons?.map((reason: string, i: number) => (
              <p key={i}>• {reason}</p>
            ))}
          </div>
        </div>
      )}

      {/* Descriptions */}
      {(book.description_zh || book.description_en) && (
        <div className="space-y-1">
          {book.description_zh && (
            <p className="text-sm">{book.description_zh}</p>
          )}
          {book.description_en && (
            <p className="text-sm text-muted-foreground">{book.description_en}</p>
          )}
        </div>
      )}
    </Card>
  )
} 