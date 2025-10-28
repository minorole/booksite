"use client";

import { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button";
import ImagePreviewDialog from "@/components/ui/image-preview-dialog";
import { Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { ErrorBanner } from './ErrorBanner';
import { LoadingIndicator } from './LoadingIndicator';
import { useChatSession } from './hooks/useChatSession';
import { StepList } from './StepList'
import Image from 'next/image'
import { useLocale } from '@/contexts/LocaleContext'
import { Bilingual } from '@/components/common/bilingual'
import { UI_STRINGS } from '@/lib/admin/i18n'

  function ChatBody() {
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const [atBottom, setAtBottom] = useState(true)
    const [requestId, setRequestId] = useState<string | null>(null)
  const { locale } = useLocale()
  const {
    messages,
    input,
    setInput,
    loading,
    error,
    setError,
    loadingLabel,
    loadingKeyRaw,
    steps,
    sendText,
    attachImage,
    reset,
    inputPlaceholder,
    thinkingAgent,
    inflightTools,
  } = useChatSession(locale, {
    onRequestId: (id) => setRequestId(id),
  })

  useEffect(() => {
    if (atBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, atBottom])

  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const onScroll = () => {
      const threshold = 64
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      setAtBottom(dist <= threshold)
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <ErrorBanner error={error} onClose={() => setError(null)} />

      <div className="flex items-center justify-between p-4">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {requestId && (
            <>
              <span><Bilingual as="span" cnText="请求" enText="Request" />: {requestId.slice(0, 8)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => navigator.clipboard.writeText(requestId!)}
                title="Copy request id"
                aria-label="Copy request id"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
          onClick={() => {
            if (input && input.trim().length > 0) {
              const lang = locale === 'zh' ? 'zh' : 'en'
              const ok = window.confirm(UI_STRINGS[lang].confirm_new_conversation)
              if (!ok) return
            }
            setRequestId(null)
            reset()
          }}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
        >
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          <Bilingual as="span" cnText="新对话" enText="New Conversation" />
        </Button>
        </div>
      </div>

      <StepList steps={steps} />
      <div className="grid grid-cols-1 gap-4 flex-1 min-h-0">
        <div className="flex flex-col h-full min-h-0">
            <MessageList
              messages={messages}
              loading={loading}
              onSelectImage={(url) => setSelectedImage(url)}
              endRef={messagesEndRef}
              containerRef={listRef}
              thinkingAgent={thinkingAgent}
              inflightTools={inflightTools}
              currentStepName={steps.find((s) => s.status === 'running')?.name || null}
            />

            {!atBottom && (
              <div className="px-4 -mt-2 mb-2">
                <div className="max-w-[var(--chat-col-width)] mx-auto">
                  <Button size="sm" variant="secondary" onClick={() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                    setAtBottom(true)
                  }}>
                    <Bilingual cnText="跳至最新" enText="Jump to latest" />
                  </Button>
                </div>
              </div>
            )}

            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={sendText}
              onSelectFile={attachImage}
              loading={loading}
              onError={(m) => setError(m)}
              placeholderOverride={inputPlaceholder || undefined}
            />
        </div>
      </div>

      <ImagePreviewDialog
        open={selectedImage !== null}
        onOpenChange={() => setSelectedImage(null)}
        src={selectedImage || ''}
        alt="Full-size image"
        sizes="(max-width: 1024px) 100vw, 1024px"
        priority
        contentClassName="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-0"
        containerClassName="relative w-full h-[85vh]"
        imageClassName="object-contain rounded-lg shadow-2xl"
      />

      {/* Single-stream mode: no separate results drawer */}

      {(() => {
        // Suppress footer during streaming phase; keep for uploads, etc.
        if (loadingKeyRaw === 'processing') return <LoadingIndicator label={null} />
        return <LoadingIndicator label={loadingLabel} />
      })()}

      {/* Removed edit/confirm dialog per preference */}
    </>
  )
}

export function ChatInterface() {
  return (
    <div className="theme-catppuccin flex flex-col h-[calc(100vh-12rem)] w-full max-w-6xl mx-auto text-foreground">
      <ChatBody />
    </div>
  )
}
