"use client";

import { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
    steps,
    sendText,
    attachImage,
    reset,
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
            />

            {!atBottom && (
              <div className="px-4 -mt-2 mb-2">
                <Button size="sm" variant="secondary" onClick={() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                  setAtBottom(true)
                }}>
                  <Bilingual cnText="跳至最新" enText="Jump to latest" />
                </Button>
              </div>
            )}

            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={sendText}
              onSelectFile={attachImage}
              loading={loading}
              onError={(m) => setError(m)}
            />
        </div>
      </div>

      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-0">
          {selectedImage && (
            <div className="relative w-full h-[85vh]">
              <Image
                src={selectedImage}
                alt="Full-size image"
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-contain rounded-lg shadow-2xl"
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single-stream mode: no separate results drawer */}

      <LoadingIndicator label={loadingLabel} />

      {/* Removed edit/confirm dialog per preference */}
    </>
  )
}

export function ChatInterface() {
  return (
    <div className="theme-catppuccin flex flex-col h-[calc(100vh-12rem)] w-full max-w-6xl mx-auto px-4 sm:px-6 text-foreground">
      <ChatBody />
    </div>
  )
}
