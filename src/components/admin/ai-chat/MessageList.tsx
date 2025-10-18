"use client";

import { Bot, Info, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from '@/lib/admin/types'
import { MessageContent } from './MessageContent'

const MESSAGE_STYLES = {
  user: {
    container: "bg-primary text-primary-foreground",
    icon: "bg-primary-foreground/10 text-primary-foreground",
    component: <User className="w-4 h-4" />,
  },
  assistant: {
    container: "bg-accent text-accent-foreground",
    icon: "bg-accent-foreground/10 text-accent-foreground",
    component: <Bot className="w-4 h-4" />,
  },
  tool: {
    container: "bg-muted text-muted-foreground",
    icon: "bg-muted-foreground/20 text-muted-foreground",
    component: <Info className="w-4 h-4" />,
  },
  system: {
    container: "bg-muted text-muted-foreground",
    icon: "bg-muted-foreground/20 text-muted-foreground",
    component: <Info className="w-4 h-4" />,
  },
} as const

export function MessageList({
  messages,
  loading,
  onSelectImage,
  endRef,
}: {
  messages: Message[]
  loading: boolean
  onSelectImage: (url: string) => void
  endRef: React.RefObject<HTMLDivElement>
}) {
  return (
    <div className="flex-1 p-4 overflow-y-auto space-y-6 scroll-smooth">
      {messages.map((message, i) => {
        const role = (['user', 'assistant', 'system', 'tool'] as const).includes(message.role as any)
          ? (message.role as keyof typeof MESSAGE_STYLES)
          : 'system'
        const style = MESSAGE_STYLES[role]
        return (
          <div key={i} className={cn("flex gap-3 p-4 rounded-lg", style.container)}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", style.icon)}>
              {style.component}
            </div>
            <div className="flex-1 space-y-2 overflow-hidden whitespace-pre-line">
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
