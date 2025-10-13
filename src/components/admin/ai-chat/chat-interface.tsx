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
import { EditAnalysisDialog } from './EditAnalysisDialog';
import { StepList } from './StepList'
import Image from 'next/image'

export function ChatInterface() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editInitial, setEditInitial] = useState<any | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
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
    confirmAnalysis,
    reset,
  } = useChatSession('en')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-[95%] sm:max-w-[90%] md:max-w-[85%] mx-auto">
      <ErrorBanner error={error} onClose={() => setError(null)} />

      <div className="flex justify-end p-4">
        <Button onClick={reset} variant="outline" size="sm" className="gap-2" disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          New Conversation
        </Button>
      </div>

      <StepList steps={steps} />

      <MessageList
        messages={messages}
        loading={loading}
        onConfirmAnalysis={confirmAnalysis}
        onEditAnalysis={(a) => {
          const init = {
            title_zh: a.title_zh,
            title_en: a.title_en,
            author_zh: a.author_zh,
            author_en: a.author_en,
            publisher_zh: a.publisher_zh,
            publisher_en: a.publisher_en,
            category_type: a.category_suggestion,
          }
          setEditInitial(init)
          setEditOpen(true)
        }}
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

      <EditAnalysisDialog
        open={editOpen}
        initial={editInitial || {}}
        onClose={() => setEditOpen(false)}
        onSave={(v) => {
          setEditOpen(false)
          confirmAnalysis(v)
        }}
      />
    </div>
  )
}
