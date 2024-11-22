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

  const formatExtractedText = (extractedText: any) => {
    if (!extractedText) return 'No text extracted';
    
    // Handle the case where extractedText is an object with raw_text and positions
    if (typeof extractedText === 'object') {
      if (extractedText.raw_text) {
        return extractedText.raw_text;
      }
      
      // If we have positions, format them nicely
      if (extractedText.positions) {
        const parts = [];
        if (extractedText.positions.title) {
          parts.push(`Title: ${extractedText.positions.title}`);
        }
        if (extractedText.positions.other && extractedText.positions.other.length > 0) {
          parts.push(`Other text: ${extractedText.positions.other.join(', ')}`);
        }
        return parts.join('\n');
      }
    }
    
    // If it's a string, return it directly
    if (typeof extractedText === 'string') {
      return extractedText;
    }
    
    return 'Invalid text format';
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
              
              {message.analysis && (
                <div className="mt-2 space-y-2 border-t border-border/50 pt-2">
                  {message.analysis.extracted_text && (
                    <div className="text-sm">
                      <p className="font-semibold">Extracted Text:</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {formatExtractedText(message.analysis.extracted_text)}
                      </p>
                    </div>
                  )}
                  
                  {message.analysis.confidence_scores && (
                    <p className="text-xs text-muted-foreground">
                      Confidence: {Math.round(message.analysis.confidence_scores.title * 100)}%
                    </p>
                  )}
                </div>
              )}

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