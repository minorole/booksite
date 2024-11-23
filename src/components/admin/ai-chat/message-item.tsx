"use client"

import { ChatMessage } from "@/types/admin/chat"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { CATEGORY_NAMES } from '@/lib/admin/constants/categories'

export interface MessageItemProps {
  message: ChatMessage
  showBookPreview?: boolean
  onTagAction?: (tag: string, action: 'approve' | 'reject') => void
}

export function MessageItem({ message, showBookPreview, onTagAction }: MessageItemProps) {
  const isUser = message.role === 'user'

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const renderAnalysis = () => {
    if (!message.analysis) return null;
    
    return (
      <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
        {/* Titles */}
        <div className="space-y-1">
          {message.analysis.title_zh && (
            <p className="font-medium">标题：{message.analysis.title_zh}</p>
          )}
          {message.analysis.title_en && (
            <p className="text-muted-foreground">Title: {message.analysis.title_en}</p>
          )}
        </div>

        {/* Authors */}
        <div className="space-y-1">
          {message.analysis.author_zh && (
            <p>作者：{message.analysis.author_zh}</p>
          )}
          {message.analysis.author_en && (
            <p className="text-muted-foreground">Author: {message.analysis.author_en}</p>
          )}
        </div>

        {/* Publisher */}
        <div className="space-y-1">
          {message.analysis.publisher_zh && (
            <p>出版：{message.analysis.publisher_zh}</p>
          )}
          {message.analysis.publisher_en && (
            <p className="text-muted-foreground">Publisher: {message.analysis.publisher_en}</p>
          )}
        </div>

        {/* Category Suggestions */}
        {message.analysis.category_suggestions && message.analysis.category_suggestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Suggested Categories:</p>
            <div className="flex flex-wrap gap-1">
              {message.analysis.category_suggestions.map((category, i) => {
                const categoryName = CATEGORY_NAMES[category]
                return (
                  <Badge key={i} variant="outline">
                    {categoryName.zh} / {categoryName.en}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        {/* Tag Suggestions */}
        {message.analysis.search_tags && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Suggested Tags:</p>
            <div className="space-y-2">
              {/* Chinese Tags */}
              <div className="flex flex-wrap gap-1">
                {message.analysis.search_tags.zh.map((tag, i) => (
                  <div key={`zh-${i}`} className="flex items-center gap-1">
                    <Badge variant="outline">
                      {tag}
                    </Badge>
                    {onTagAction && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTagAction(tag, 'approve')}
                          className="h-6 w-6 p-0"
                          title="Approve tag"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTagAction(tag, 'reject')}
                          className="h-6 w-6 p-0"
                          title="Reject tag"
                        >
                          ✕
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* English Tags */}
              <div className="flex flex-wrap gap-1">
                {message.analysis.search_tags.en.map((tag, i) => (
                  <div key={`en-${i}`} className="flex items-center gap-1">
                    <Badge variant="outline">
                      {tag}
                    </Badge>
                    {onTagAction && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTagAction(tag, 'approve')}
                          className="h-6 w-6 p-0"
                          title="Approve tag"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onTagAction(tag, 'reject')}
                          className="h-6 w-6 p-0"
                          title="Reject tag"
                        >
                          ✕
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Confidence Scores */}
        {message.analysis.confidence_scores && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Title Confidence: {Math.round(message.analysis.confidence_scores.title * 100)}%</p>
            <p>Language Detection: {Math.round(message.analysis.confidence_scores.language_detection * 100)}%</p>
            <p>Category Confidence: {Math.round(message.analysis.confidence_scores.category * 100)}%</p>
            <p>Tag Confidence: {Math.round(message.analysis.confidence_scores.tags * 100)}%</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "flex gap-3 w-full mb-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <div className={cn(
          "flex h-full w-full items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isUser ? 'U' : 'AI'}
        </div>
      </Avatar>

      <div className={cn(
        "flex flex-col gap-2 max-w-[85%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-2",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          message.metadata?.error && "bg-destructive/10 border border-destructive/50"
        )}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          {message.metadata?.error && message.metadata.errorDetails && (
            <p className="text-sm text-destructive mt-1">
              Error details: {message.metadata.errorDetails}
            </p>
          )}
          {renderAnalysis()}
        </div>

        {message.imageUrl && (
          <Dialog>
            <DialogTrigger asChild>
              <div className="relative w-48 h-64 cursor-pointer hover:opacity-90 transition-opacity">
                <Image
                  src={message.imageUrl}
                  alt="Book cover"
                  fill
                  className="object-contain rounded-md"
                />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] max-h-[90vh] w-fit h-fit p-0">
              <DialogTitle>
                <VisuallyHidden>Book Cover Image</VisuallyHidden>
              </DialogTitle>
              <DialogDescription>
                <VisuallyHidden>Enlarged view of book cover</VisuallyHidden>
              </DialogDescription>
              <div className="relative w-[80vw] h-[80vh]">
                <Image
                  src={message.imageUrl}
                  alt="Book cover"
                  fill
                  className="object-contain"
                  sizes="80vw"
                  priority
                />
              </div>
            </DialogContent>
          </Dialog>
        )}

        <span className="text-xs text-muted-foreground">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  )
} 