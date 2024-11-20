"use client"

import { ChatMessage } from '@/lib/ai/types';
import { Avatar } from '@/components/ui/avatar';
import Image from 'next/image';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div key={index} className={`flex gap-3 ${
          message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
        }`}>
          <Avatar className="h-8 w-8">
            <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground">
              {message.role === 'user' ? 'U' : 'AI'}
            </div>
          </Avatar>
          
          <div className={`rounded-lg px-4 py-2 max-w-[80%] ${
            message.role === 'user' 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {/* Single image preview */}
            {message.imageUrl && (
              <div className="mt-2 relative w-48 h-64">
                <Image
                  src={message.imageUrl}
                  alt="Book cover"
                  fill
                  className="object-contain rounded-md"
                />
              </div>
            )}

            {/* Side by side image comparison */}
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

            <span className="text-xs opacity-50 mt-1 block">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
} 