"use client";

import { useRef } from 'react'
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, Send } from "lucide-react";
import { FILE_CONFIG } from '@/lib/admin/constants'
import { useLocale } from '@/contexts/LocaleContext'
import { ERROR_MESSAGES, UI_STRINGS } from '@/lib/admin/i18n'

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onSelectFile,
  loading,
  onError,
}: {
  input: string
  setInput: (v: string) => void
  onSubmit: () => void
  onSelectFile: (file: File) => void
  loading: boolean
  onError?: (message: string) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { locale } = useLocale()

  function validateAndSelect(file: File) {
    const lang = locale === 'zh' ? 'zh' as const : 'en' as const
    if (!FILE_CONFIG.ALLOWED_TYPES.includes(file.type as any)) {
      onError?.(ERROR_MESSAGES[lang].invalid_file)
      return
    }
    if (file.size > FILE_CONFIG.MAX_SIZE) {
      onError?.(ERROR_MESSAGES[lang].file_too_large)
      return
    }
    onSelectFile(file)
  }
  return (
    <div className="p-4 bg-background/80 backdrop-blur-sm sticky bottom-0 z-10">
      <div className="max-w-2xl mx-auto">
        <div
          className="relative isolate border-0 focus-within:outline-none focus-within:ring-0 focus-within:ring-offset-0 focus-within:border-0"
          onDragOver={(e) => {
            if (loading) return
            e.preventDefault()
          }}
          onDrop={(e) => {
            if (loading) return
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) validateAndSelect(f)
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={UI_STRINGS[locale === 'zh' ? 'zh' : 'en'].input_placeholder}
            className="min-h-[3rem] max-h-[20rem] pr-24 resize-none bg-background w-full rounded-lg border-0 shadow-inner focus-visible:ring-0 focus:ring-0 focus-visible:ring-offset-0 focus:ring-offset-0 focus-visible:border-transparent focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.metaKey || e.ctrlKey) {
                  e.preventDefault()
                  onSubmit()
                } else if (!e.shiftKey) {
                  e.preventDefault()
                  onSubmit()
                }
              }
            }}
            onPaste={(e) => {
              if (loading) return
              const items = e.clipboardData?.items
              if (!items) return
              for (const it of items) {
                if (it.kind === 'file') {
                  const f = it.getAsFile()
                  if (f) {
                    validateAndSelect(f)
                    break
                  }
                }
              }
            }}
          />
          <div className="absolute right-2 bottom-2 flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept={FILE_CONFIG.ACCEPT_STRING}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) validateAndSelect(f)
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="default"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              aria-label="Attach image"
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" className="h-8 w-8" onClick={onSubmit} disabled={loading || !input.trim()} aria-label="Send message">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
