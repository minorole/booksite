"use client";

import { Expand, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message, MessageContent as MsgContent } from '@/lib/admin/types'
import Image from 'next/image'
import { CATEGORY_LABELS } from '@/lib/admin/constants'
import type { CategoryType } from '@/lib/db/enums'
import type { DuplicateDetectionResult } from '@/lib/admin/types/results'
import { DuplicateMatchesCard } from '@/components/admin/ai-chat/cards/DuplicateMatchesCard'
import { SearchResultsList } from '@/components/admin/ai-chat/cards/SearchResultsList'
import { BookSummaryCard } from '@/components/admin/ai-chat/cards/BookSummaryCard'
import { OrderUpdateCard } from '@/components/admin/ai-chat/cards/OrderUpdateCard'
import { Bilingual } from '@/components/common/bilingual'
import { ADMIN_AI_RICH_ASSISTANT_TEXT } from '@/lib/admin/constants'
import { RichTextAuto } from './RichTextAuto'
import { useLocale } from '@/contexts/LocaleContext'
import { UI_STRINGS, STEP_LABELS } from '@/lib/admin/i18n'
import { useMemo, useState } from 'react'

export function MessageContent({
  message,
  loading,
  thinkingAgent,
  inflightTools,
  currentStepName,
  onSelectImage,
}: {
  message: Message
  loading: boolean
  thinkingAgent?: string | null
  inflightTools?: Message[]
  currentStepName?: string | null
  onSelectImage: (url: string) => void
}) {
  const { locale } = useLocale()
  const [showDetails, setShowDetails] = useState(false)
  const statusLabel = useMemo(() => {
    if (!currentStepName) return null
    const map = STEP_LABELS[locale === 'zh' ? 'zh' : 'en'] as Record<string, string>
    return map[currentStepName] || currentStepName
  }, [currentStepName, locale])

  function renderToolCard(msg: Message) {
    try {
      if (msg.role !== 'tool') return null
      const content = msg.content ? JSON.parse(msg.content as string) : null
      const data = (content?.data || content) as any
      const vision = data?.vision_analysis
      const item = data?.item_analysis
      const name = msg.name
      const duplicate = data?.duplicate_detection
      const search = data?.search
      const createdBook = data?.book
      const order = data?.order
      if (item?.structured_data) {
        const sd = item.structured_data
        return (
          <div className="space-y-2">
            <p><Bilingual cnText="物品分析完成。结构化信息：" enText="Item analysis complete. Structured details:" /></p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              {sd.name && <p><Bilingual cnText="名称" enText="Name" />: {sd.name}</p>}
              {sd.type && <p><Bilingual cnText="类型" enText="Type" />: {sd.type}</p>}
              {sd.material && <p><Bilingual cnText="材质" enText="Material" />: {sd.material}</p>}
              {sd.finish && <p><Bilingual cnText="表面" enText="Finish" />: {sd.finish}</p>}
              {sd.size && <p><Bilingual cnText="尺寸" enText="Size" />: {sd.size}</p>}
              {sd.dimensions && <p><Bilingual cnText="规格" enText="Dimensions" />: {sd.dimensions}</p>}
            </div>
          </div>
        )
      }
      if (vision?.structured_data) {
        const sd = vision.structured_data
        return (
          <div className="space-y-2">
            <p><Bilingual cnText="分析完成！以下是结构化数据：" enText="Analysis complete! Here’s the structured data:" /></p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              <p><Bilingual cnText="置信度" enText="Confidence Score" />: {Math.round(sd.confidence_scores.overall * 100)}%</p>
              <p><Bilingual cnText="语言" enText="Language" />: {sd.language_detection.primary_language.toUpperCase()}</p>
              {sd.visual_elements.notable_elements.length > 0 && (
                <p><Bilingual cnText="重要元素" enText="Notable Elements" />: {sd.visual_elements.notable_elements.join(', ')}</p>
              )}
            </div>
          </div>
        )
      }
      if (duplicate) {
        type BookItem = { id: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[] }
        return (
          <DuplicateMatchesCard data={data as { duplicate_detection?: DuplicateDetectionResult; search?: { books: BookItem[] } } | null} />
        )
      }
      if (search?.books) {
        type BookItem = { id: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[] }
        return <SearchResultsList data={data as { search?: { books: BookItem[] } } | null} />
      }
      if (createdBook && (name === 'create_book' || name === 'update_book')) {
        return <BookSummaryCard data={data as { book?: { id?: string; title_en?: string | null; title_zh?: string | null; quantity?: number; tags?: string[]; category_type?: string } } | null} mode={name === 'update_book' ? 'updated' : 'created'} />
      }
      if (order && name === 'update_order') {
        return <OrderUpdateCard data={data as { order?: { order_id: string; status?: string | null; tracking_number?: string | null } } | null} />
      }
      if (vision?.natural_analysis) {
        const a = vision.natural_analysis
        return (
          <div className="space-y-2">
            <p><Bilingual cnText="我已分析该书封面，发现如下：" enText="I’ve analyzed this book cover. Here’s what I found:" /></p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              {a.title_zh && <p><Bilingual cnText="标题（中文）" enText="Title (Chinese)" />: {a.title_zh}</p>}
              {a.title_en && <p><Bilingual cnText="标题（英文）" enText="Title (English)" />: {a.title_en}</p>}
              {a.author_zh && <p><Bilingual cnText="作者（中文）" enText="Author (Chinese)" />: {a.author_zh}</p>}
              {a.author_en && <p><Bilingual cnText="作者（英文）" enText="Author (English)" />: {a.author_en}</p>}
              {a.publisher_zh && <p><Bilingual cnText="出版社（中文）" enText="Publisher (Chinese)" />: {a.publisher_zh}</p>}
              {a.publisher_en && <p><Bilingual cnText="出版社（英文）" enText="Publisher (English)" />: {a.publisher_en}</p>}
              {a.category_suggestion && (
                <p>
                  <Bilingual cnText="建议分类" enText="Suggested Category" />: {a.category_suggestion} ({CATEGORY_LABELS[a.category_suggestion as CategoryType]})
                </p>
              )}
              {a.quality_issues?.length ? (
                <div className="mt-2">
                  <p className="font-medium"><Bilingual cnText="质量问题：" enText="Quality Issues:" /></p>
                  <ul className="list-disc list-inside">
                    {a.quality_issues.map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        )
      }
    } catch {}
    return <p>{String((msg as any)?.content || '')}</p>
  }

  // Inline thinking indicator for assistant placeholder
  if (
    message.role === 'assistant' &&
    typeof message.content === 'string' &&
    message.content.length === 0 &&
    loading
  ) {
    const lang = locale === 'zh' ? 'zh' : 'en'
    const base = thinkingAgent ? `${UI_STRINGS[lang].thinking} (${thinkingAgent})` : UI_STRINGS[lang].thinking
    const label = statusLabel ? `${base} — ${statusLabel}` : base
    return (
      <div className="flex flex-col gap-2 text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{label}</span>
          {inflightTools && inflightTools.length > 0 && (
            <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? UI_STRINGS[lang].details_hide : UI_STRINGS[lang].details_show}
            </Button>
          )}
        </div>
        {showDetails && (
          <div className="mt-1 pl-3 border-l border-border/60 space-y-3">
            {inflightTools && inflightTools.length > 0 ? (
              inflightTools.map((t, i) => (
                <div key={i} className="bg-background/60 rounded-lg border p-2">
                  {renderToolCard(t)}
                </div>
              ))
            ) : (
              <span className="text-sm">{UI_STRINGS[lang].no_details}</span>
            )}
          </div>
        )}
      </div>
    )
  }

  // Array content (image + text)
  if (Array.isArray(message.content)) {
    return (
      <div className="space-y-2">
        {message.content.map((content: MsgContent, i) => {
          if (content.type === 'image_url' && content.image_url?.url) {
            const imageUrl = content.image_url.url
            return (
              <div key={i} className="relative">
                <Image
                  src={imageUrl}
                  alt="User uploaded image"
                  width={512}
                  height={512}
                  className="max-w-sm h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectImage(imageUrl)}
                />
              </div>
            )
          }
          if (content.type === 'text') {
            if (message.role === 'assistant' && ADMIN_AI_RICH_ASSISTANT_TEXT) {
              return <RichTextAuto key={i} text={content.text || ''} />
            }
            return <p key={i}>{content.text}</p>
          }
          return null
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
            <p><Bilingual cnText="物品分析完成。结构化信息：" enText="Item analysis complete. Structured details:" /></p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              {sd.name && <p><Bilingual cnText="名称" enText="Name" />: {sd.name}</p>}
              {sd.type && <p><Bilingual cnText="类型" enText="Type" />: {sd.type}</p>}
              {sd.material && <p><Bilingual cnText="材质" enText="Material" />: {sd.material}</p>}
              {sd.finish && <p><Bilingual cnText="表面" enText="Finish" />: {sd.finish}</p>}
              {sd.size && <p><Bilingual cnText="尺寸" enText="Size" />: {sd.size}</p>}
              {sd.dimensions && <p><Bilingual cnText="规格" enText="Dimensions" />: {sd.dimensions}</p>}
              {sd.category_suggestion && (
                <p>
                  <Bilingual cnText="建议分类" enText="Suggested Category" />: {sd.category_suggestion} ({CATEGORY_LABELS[sd.category_suggestion as CategoryType]})
                </p>
              )}
              {Array.isArray(sd.tags) && sd.tags.length > 0 && (
                <p><Bilingual cnText="标签" enText="Tags" />: {sd.tags.join(', ')}</p>
              )}
              {Array.isArray(sd.quality_issues) && sd.quality_issues.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium"><Bilingual cnText="质量问题：" enText="Quality Issues:" /></p>
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
            <p><Bilingual cnText="分析完成！以下是结构化数据：" enText="Analysis complete! Here’s the structured data:" /></p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              <p><Bilingual cnText="置信度" enText="Confidence Score" />: {Math.round(sd.confidence_scores.overall * 100)}%</p>
              <p><Bilingual cnText="语言" enText="Language" />: {sd.language_detection.primary_language.toUpperCase()}</p>
              {sd.visual_elements.notable_elements.length > 0 && (
                <p><Bilingual cnText="重要元素" enText="Notable Elements" />: {sd.visual_elements.notable_elements.join(', ')}</p>
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
            <p><Bilingual cnText="我已分析该书封面，发现如下：" enText="I’ve analyzed this book cover. Here’s what I found:" /></p>
            <div className="pl-4 border-l-2 border-primary/20 space-y-1">
              {a.title_zh && <p><Bilingual cnText="标题（中文）" enText="Title (Chinese)" />: {a.title_zh}</p>}
              {a.title_en && <p><Bilingual cnText="标题（英文）" enText="Title (English)" />: {a.title_en}</p>}
              {a.author_zh && <p><Bilingual cnText="作者（中文）" enText="Author (Chinese)" />: {a.author_zh}</p>}
              {a.author_en && <p><Bilingual cnText="作者（英文）" enText="Author (English)" />: {a.author_en}</p>}
              {a.publisher_zh && <p><Bilingual cnText="出版社（中文）" enText="Publisher (Chinese)" />: {a.publisher_zh}</p>}
              {a.publisher_en && <p><Bilingual cnText="出版社（英文）" enText="Publisher (English)" />: {a.publisher_en}</p>}
              {a.category_suggestion && (
                <p>
                  <Bilingual cnText="建议分类" enText="Suggested Category" />: {a.category_suggestion} ({CATEGORY_LABELS[a.category_suggestion as CategoryType]})
                </p>
              )}
              {a.quality_issues?.length ? (
                <div className="mt-2">
                  <p className="font-medium"><Bilingual cnText="质量问题：" enText="Quality Issues:" /></p>
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

  if (message.role === 'assistant' && ADMIN_AI_RICH_ASSISTANT_TEXT) {
    return <RichTextAuto text={String(message.content)} />
  }
  return <p>{String(message.content)}</p>
}
