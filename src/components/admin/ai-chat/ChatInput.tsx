"use client";

import { useRef } from 'react'
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, Loader2, Send } from "lucide-react";
import { FILE_CONFIG } from '@/lib/admin/constants'

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onSelectFile,
  loading,
}: {
  input: string
  setInput: (v: string) => void
  onSubmit: () => void
  onSelectFile: (file: File) => void
  loading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  return (
    <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[3rem] max-h-[20rem] pr-24 resize-none bg-background w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                onSubmit()
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
                if (f) onSelectFile(f)
              }}
            />
            <Button
              type="button"
              size="icon"
              variant="default"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" className="h-8 w-8" onClick={onSubmit} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

