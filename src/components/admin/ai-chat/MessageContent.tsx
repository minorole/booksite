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
  onConfirmAnalysis: (analysis: any) => void
  onEditAnalysis: (analysis: any) => void
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
      const vision = content?.vision_analysis
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

  return <p>{message.content as any}</p>
}
