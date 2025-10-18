"use client";

import { Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message, MessageContent as MsgContent } from '@/lib/admin/types'
import Image from 'next/image'
import { CATEGORY_LABELS } from '@/lib/admin/constants'
import type { CategoryType } from '@/lib/db/enums'
import type { DuplicateDetectionResult } from '@/lib/admin/types/results'
import { DuplicateMatchesCard } from '@/components/admin/ai-chat/results/cards/DuplicateMatchesCard'
import { SearchResultsList } from '@/components/admin/ai-chat/results/cards/SearchResultsList'
import { BookSummaryCard } from '@/components/admin/ai-chat/results/cards/BookSummaryCard'
import { OrderUpdateCard } from '@/components/admin/ai-chat/results/cards/OrderUpdateCard'

export function MessageContent({
  message,
  loading,
  onSelectImage,
}: {
  message: Message
  loading: boolean
  onSelectImage: (url: string) => void
}) {
  // Array content (image + text)
  if (Array.isArray(message.content)) {
    return (
      <div className="space-y-2">
        {message.content.map((content: MsgContent, i) => {
          if (content.type === 'image_url' && content.image_url?.url) {
            const imageUrl = content.image_url.url
            return (
              <div key={i} className="relative group">
                <Image
                  src={imageUrl}
                  alt="Uploaded content"
                  width={512}
                  height={512}
                  className="max-w-sm h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectImage(imageUrl)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onSelectImage(imageUrl)}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </div>
            )
          }
          return content.type === 'text' && <p key={i}>{content.text}</p>
        })}
      </div>
    )
  }

  // Tool results: render both initial and structured analysis
  if (message.role === 'tool') {
    try {
      const content = message.content ? JSON.parse(message.content) : null
      const data = content?.data || content
      const vision = data?.vision_analysis
      const item = data?.item_analysis
      const name = message.name
      // Duplicates / search rendering
      const duplicate = data?.duplicate_detection
      const search = data?.search
      const createdBook = data?.book
      const order = data?.order
      if (item?.structured_data) {
        const sd = item.structured_data
        return (
          <div className="space-y-2">
            <p>Item analysis complete. Structured details:</p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              {sd.name && <p>Name: {sd.name}</p>}
              {sd.type && <p>Type: {sd.type}</p>}
              {sd.material && <p>Material: {sd.material}</p>}
              {sd.finish && <p>Finish: {sd.finish}</p>}
              {sd.size && <p>Size: {sd.size}</p>}
              {sd.dimensions && <p>Dimensions: {sd.dimensions}</p>}
              {sd.category_suggestion && (
                <p>
                  Suggested Category: {sd.category_suggestion} ({CATEGORY_LABELS[sd.category_suggestion as CategoryType]})
                </p>
              )}
              {Array.isArray(sd.tags) && sd.tags.length > 0 && (
                <p>Tags: {sd.tags.join(', ')}</p>
              )}
              {Array.isArray(sd.quality_issues) && sd.quality_issues.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Quality Issues:</p>
                  <ul className="list-disc list-inside">
                    {sd.quality_issues.map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )
      }
      if (vision?.structured_data) {
        const sd = vision.structured_data
        return (
          <div className="space-y-2">
            <p>Analysis complete! Here’s the structured data:</p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              <p>Confidence Score: {Math.round(sd.confidence_scores.overall * 100)}%</p>
              <p>Language: {sd.language_detection.primary_language.toUpperCase()}</p>
              {sd.visual_elements.notable_elements.length > 0 && (
                <p>Notable Elements: {sd.visual_elements.notable_elements.join(', ')}</p>
              )}
            </div>
          </div>
        )
      }
      // Duplicate detection: reuse card
      if (duplicate) {
        type BookItem = { id: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[] }
        return (
          <DuplicateMatchesCard data={data as { duplicate_detection?: DuplicateDetectionResult; search?: { books: BookItem[] } } | null} />
        )
      }
      // Search results: reuse card
      if (search?.books) {
        type BookItem = { id: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[] }
        return <SearchResultsList data={data as { search?: { books: BookItem[] } } | null} />
      }
      // Book create/update summary: reuse card
      if (createdBook && (name === 'create_book' || name === 'update_book')) {
        return <BookSummaryCard data={data as { book?: { id?: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[]; category_type?: string } } | null} mode={name === 'update_book' ? 'updated' : 'created'} />
      }
      // Order update: reuse card
      if (order && name === 'update_order') {
        return <OrderUpdateCard data={data as { order?: { order_id: string; status?: string | null; tracking_number?: string | null } } | null} />
      }
      if (vision?.natural_analysis) {
        const a = vision.natural_analysis
        return (
          <div className="space-y-2">
            <p>I’ve analyzed this book cover. Here’s what I found:</p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              {a.title_zh && <p>Title (Chinese): {a.title_zh}</p>}
              {a.title_en && <p>Title (English): {a.title_en}</p>}
              {a.author_zh && <p>Author (Chinese): {a.author_zh}</p>}
              {a.author_en && <p>Author (English): {a.author_en}</p>}
              {a.publisher_zh && <p>Publisher (Chinese): {a.publisher_zh}</p>}
              {a.publisher_en && <p>Publisher (English): {a.publisher_en}</p>}
              {a.category_suggestion && (
                <p>
                  Suggested Category: {a.category_suggestion} ({CATEGORY_LABELS[a.category_suggestion as CategoryType]})
                </p>
              )}
              {a.quality_issues?.length ? (
                <div className="mt-2">
                  <p className="font-medium">Quality Issues:</p>
                  <ul className="list-disc list-inside">
                    {a.quality_issues.map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            {/* Removed visible confirmation UI per preference */}
          </div>
        )
      }
      return <p>{message.content}</p>
    } catch {
      return <p>{message.content}</p>
    }
  }

  return <p>{String(message.content)}</p>
}
