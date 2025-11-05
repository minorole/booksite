'use client';

import { Bot, Info, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message } from '@/lib/admin/types';
import { MessageContent } from './MessageContent';

const MESSAGE_STYLES = {
  user: {
    container: 'bg-accent/10 text-foreground border border-accent/20',
    icon: 'bg-primary/15 text-primary',
    component: <User className="h-4 w-4" />,
    row: 'flex-row-reverse text-right',
    align: 'ml-auto',
  },
  assistant: {
    container: 'bg-background text-foreground border border-border',
    icon: 'bg-accent/15 text-accent-foreground',
    component: <Bot className="h-4 w-4" />,
    row: '',
    align: 'mr-auto',
  },
  tool: {
    container: 'bg-muted/40 text-muted-foreground border border-muted',
    icon: 'bg-muted-foreground/20 text-muted-foreground',
    component: <Info className="h-4 w-4" />,
    row: '',
    align: 'mr-auto',
  },
  system: {
    container: 'bg-muted/40 text-muted-foreground border border-muted',
    icon: 'bg-muted-foreground/20 text-muted-foreground',
    component: <Info className="h-4 w-4" />,
    row: '',
    align: 'mr-auto',
  },
} as const;

export function MessageList({
  messages,
  loading,
  onSelectImage,
  endRef,
  containerRef,
  onScroll,
  thinkingAgent,
  inflightTools,
  currentStepName,
}: {
  messages: Message[];
  loading: boolean;
  onSelectImage: (url: string) => void;
  endRef: React.RefObject<HTMLDivElement | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  thinkingAgent?: string | null;
  inflightTools?: Message[];
  currentStepName?: string | null;
}) {
  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto scroll-smooth p-4"
    >
      <div className="mx-auto w-full max-w-[var(--chat-col-width)] space-y-6">
        {messages.map((message, i) => {
          const role = (['user', 'assistant', 'system', 'tool'] as const).includes(
            message.role as any,
          )
            ? (message.role as keyof typeof MESSAGE_STYLES)
            : 'system';
          const style = MESSAGE_STYLES[role];
          const textClass = role === 'assistant' || role === 'user' ? 'text-foreground' : '';
          return (
            <div
              key={i}
              className={cn(
                'flex gap-3 rounded-2xl p-4 shadow-sm',
                style.container,
                style.row,
                style.align,
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  style.icon,
                )}
              >
                {style.component}
              </div>
              <div
                className={cn(
                  'flex-1 space-y-3 overflow-hidden text-[15px] leading-6 whitespace-pre-line',
                  textClass,
                )}
              >
                <MessageContent
                  message={message}
                  loading={loading}
                  thinkingAgent={thinkingAgent || null}
                  inflightTools={inflightTools || []}
                  currentStepName={currentStepName || null}
                  onSelectImage={onSelectImage}
                />
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
