"use client";

import { Bot, Info, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from '@/lib/admin/types'
import { MessageContent } from './MessageContent'

const MESSAGE_STYLES = {
  user: {
    container: "bg-accent/10 text-foreground border border-accent/20",
    icon: "bg-primary/15 text-primary",
    component: <User className="w-4 h-4" />,
    row: "flex-row-reverse text-right",
    align: "ml-auto",
  },
  assistant: {
    container: "bg-background text-foreground border border-border",
    icon: "bg-accent/15 text-accent-foreground",
    component: <Bot className="w-4 h-4" />,
    row: "",
    align: "mr-auto",
  },
  tool: {
    container: "bg-muted/40 text-muted-foreground border border-muted",
    icon: "bg-muted-foreground/20 text-muted-foreground",
    component: <Info className="w-4 h-4" />,
    row: "",
    align: "mr-auto",
  },
  system: {
    container: "bg-muted/40 text-muted-foreground border border-muted",
    icon: "bg-muted-foreground/20 text-muted-foreground",
    component: <Info className="w-4 h-4" />,
    row: "",
    align: "mr-auto",
  },
} as const

export function MessageList({
  messages,
  loading,
  onSelectImage,
  endRef,
  containerRef,
  onScroll,
}: {
  messages: Message[]
  loading: boolean
  onSelectImage: (url: string) => void
  endRef: React.RefObject<HTMLDivElement>
  containerRef?: React.RefObject<HTMLDivElement>
  onScroll?: React.UIEventHandler<HTMLDivElement>
}) {
  return (
    <div ref={containerRef} onScroll={onScroll} className="flex-1 p-4 overflow-y-auto space-y-6 scroll-smooth">
      {messages.map((message, i) => {
        const role = (['user', 'assistant', 'system', 'tool'] as const).includes(message.role as any)
          ? (message.role as keyof typeof MESSAGE_STYLES)
          : 'system'
        const style = MESSAGE_STYLES[role]
        const textClass = role === 'assistant' || role === 'user' ? 'text-foreground' : ''
        return (
          <div key={i} className={cn("flex gap-3 p-4 rounded-2xl shadow-sm", style.container, style.row, style.align, "max-w-[65ch]") }>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", style.icon)}>
              {style.component}
            </div>
            <div className={cn("flex-1 space-y-3 leading-6 text-[15px] overflow-hidden whitespace-pre-line", textClass)}>
              <MessageContent
                message={message}
                loading={loading}
                onSelectImage={onSelectImage}
              />
            </div>
          </div>
        )
      })}
      <div ref={endRef} />
    </div>
  )
}
