"use client"

import { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageIcon, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  onImageUpload: (file: File) => void;
  isProcessing: boolean;
}

export function ChatInput({ onSubmit, onImageUpload, isProcessing }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current?.value.trim();
    if (!input) return;

    onSubmit(input);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImageUpload(file);
          e.target.value = ''; // Reset file input
        }}
        accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
        className="hidden"
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className={cn(
          "hover:bg-muted transition-colors",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
      >
        <ImageIcon className="h-5 w-5" />
      </Button>

      <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
        <Input
          ref={inputRef}
          placeholder="Type your message..."
          disabled={isProcessing}
          onKeyDown={handleKeyDown}
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
        />
        <Button 
          type="submit" 
          size="icon"
          variant="ghost"
          disabled={isProcessing}
          className={cn(
            "hover:bg-background transition-colors",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </form>
  );
} 