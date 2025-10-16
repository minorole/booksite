"use client";

import { Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message, MessageContent as MsgContent } from '@/lib/admin/types'
import { AnalysisConfirmation } from './AnalysisConfirmation'
import Image from 'next/image'
import { CATEGORY_LABELS } from '@/lib/admin/constants'
import type { CategoryType } from '@/lib/db/enums'

export function MessageContent({
  message,
  loading,
  onConfirmAnalysis,
  onEditAnalysis,
  onSelectImage,
}: {
  message: Message
  loading: boolean
  onConfirmAnalysis: (analysis: unknown) => void
  onEditAnalysis: (analysis: unknown) => void
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
      // Duplicate detection summary
      if (duplicate) {
        const matches = duplicate.matches || []
        const rec = duplicate.analysis?.recommendation
        return (
          <div className="space-y-2">
            <p>Duplicate check complete.</p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              <p>Recommendation: {rec || 'n/a'}</p>
              <p>Matches: {matches.length}</p>
              {matches.slice(0, 3).map((m: { similarity_score?: number }, i: number) => (
                <p key={i}>Match #{i + 1}: score {Math.round(((m.similarity_score ?? 0) * 100))}%</p>
              ))}
            </div>
          </div>
        )
      }
      // Search results summary
      if (search?.books) {
        const books = search.books as Array<{ id: string; title_en?: string; title_zh?: string }>
        return (
          <div className="space-y-2">
            <p>Found {books.length} book(s).</p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              {books.slice(0, 5).map((b) => (
                <p key={b.id}>{b.title_en || b.title_zh}</p>
              ))}
            </div>
          </div>
        )
      }
      // Book create/update summary
      if (createdBook && (name === 'create_book' || name === 'update_book')) {
        const b = createdBook
        return (
          <div className="space-y-1">
            <p>{name === 'create_book' ? 'Book created successfully.' : 'Book updated successfully.'}</p>
            <p>Title: {b.title_en || b.title_zh}</p>
          </div>
        )
      }
      // Order update summary
      if (order && name === 'update_order') {
        const o = order
        return (
          <div className="space-y-1">
            <p>Order updated.</p>
            <p>ID: {o.order_id} {o.status ? `(status: ${o.status})` : ''} {o.tracking_number ? `(tracking: ${o.tracking_number})` : ''}</p>
          </div>
        )
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
            {a.needs_confirmation && (
              <AnalysisConfirmation analysis={{
                title_zh: a.title_zh,
                title_en: a.title_en,
                author_zh: a.author_zh,
                author_en: a.author_en,
                publisher_zh: a.publisher_zh,
                publisher_en: a.publisher_en,
                category_type: a.category_suggestion,
                quality_issues: a.quality_issues,
              }} onConfirm={() => onConfirmAnalysis(a)} onEdit={() => onEditAnalysis(a)} loading={loading} />
            )}
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
