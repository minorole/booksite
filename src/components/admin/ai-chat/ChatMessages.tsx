"use client"

import { ChatMessage } from '@/lib/ai/types';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { Avatar } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="flex flex-col space-y-4 p-4 md:p-6">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';

        return (
          <div key={index} className={cn(
            "flex gap-3 w-full",
            isUser ? "flex-row-reverse" : "flex-row"
          )}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
                {isUser ? 'U' : 'AI'}
              </div>
            </Avatar>
            <div className={cn(
              "rounded-lg px-4 py-2 max-w-[85%]",
              isUser ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {/* Image handling remains the same */}
              {message.imageUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="mt-2 relative w-48 h-64 cursor-pointer hover:opacity-90 transition-opacity">
                      <Image
                        src={message.imageUrl}
                        alt="Book cover"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain rounded-md"
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl h-[80vh]">
                    <div className="relative w-full h-full">
                      <Image
                        src={message.imageUrl}
                        alt="Book cover"
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-contain"
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {message.images && (
                <div className="mt-2 flex gap-2">
                  <div className="relative w-48 h-64">
                    <Image
                      src={message.images.existing}
                      alt="Existing book cover"
                      fill
                      className="object-contain rounded-md"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center rounded-b-md">
                      Existing
                    </span>
                  </div>
                  <div className="relative w-48 h-64">
                    <Image
                      src={message.images.new}
                      alt="New book cover"
                      fill
                      className="object-contain rounded-md"
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center rounded-b-md">
                      New
                    </span>
                  </div>
                </div>
              )}

              <span 
                className="text-xs opacity-50 mt-1 block"
                suppressHydrationWarning
              >
                {formatTimestamp(message.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
} 