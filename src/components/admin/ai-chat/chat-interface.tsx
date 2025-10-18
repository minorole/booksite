"use client";

import { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
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
import { ResultStoreProvider, useResultsStore } from './state/useResultsStore'
import { ResultsPanel } from './results/ResultsPanel'

function ChatBody() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { locale } = useLocale()
  const results = useResultsStore()
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
    onToolResult: (evt) => results.setFromToolResult(evt),
    onRequestId: (id) => results.setRequestId(id),
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <>
      <ErrorBanner error={error} onClose={() => setError(null)} />

      <div className="flex items-center justify-between p-4">
        <div className="text-xs text-muted-foreground">
          {results.requestId && (
            <button
              className="rounded px-2 py-0.5 hover:bg-muted"
              onClick={() => navigator.clipboard.writeText(results.requestId!)}
              title="Copy request id"
            >
              <Bilingual as="span" cnText="请求" enText="Request" />: {results.requestId.slice(0, 8)}
            </button>
          )}
        </div>
        <Button
          onClick={() => {
            results.reset()
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

      <StepList steps={steps} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
            <MessageList
              messages={messages}
              loading={loading}
              onSelectImage={(url) => setSelectedImage(url)}
              endRef={messagesEndRef}
            />

            <ChatInput
              input={input}
              setInput={setInput}
              onSubmit={sendText}
              onSelectFile={attachImage}
              loading={loading}
            />
        </div>
        <div className="block md:block">
          <ResultsPanel />
        </div>
      </div>

      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-0">
          {selectedImage && (
            <div className="relative w-full h-[85vh]">
              <Image
                src={selectedImage}
                alt="Full size content"
                fill
                sizes="(max-width: 1024px) 100vw, 1024px"
                className="object-contain rounded-lg shadow-2xl"
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <LoadingIndicator label={loadingLabel} />

      {/* Removed edit/confirm dialog per preference */}
    </>
  )
}

export function ChatInterface() {
  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-[95%] sm:max-w-[90%] md:max-w-[85%] mx-auto">
      <ResultStoreProvider>
        <ChatBody />
      </ResultStoreProvider>
    </div>
  )
}
