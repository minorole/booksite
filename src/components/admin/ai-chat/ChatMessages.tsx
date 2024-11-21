"use client"

import { ChatMessage } from '@/lib/ai/types';
import { Avatar } from '@/components/ui/avatar';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Loader2, X } from "lucide-react"
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

// Move ImageWithLoading outside the main component
const ImageWithLoading = ({ 
  src, 
  alt,
  onLoadStart,
  onLoadComplete,
  onError 
}: { 
  src: string; 
  alt: string;
  onLoadStart: (src: string) => void;
  onLoadComplete: (src: string) => void;
  onError: (src: string) => void;
}) => {
  useEffect(() => {
    console.log('ImageWithLoading mounted for:', src);
    onLoadStart(src);
    
    return () => {
      console.log('ImageWithLoading unmounted for:', src);
    };
  }, [src, onLoadStart]);

  return (
    <div className="relative w-full h-full">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        onLoad={() => {
          console.log('Image loaded successfully:', src);
          onLoadComplete(src);
        }}
        onError={() => {
          console.error('Image load error:', src);
          onError(src);
        }}
        loading="lazy"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};

export function ChatMessages({ messages }: ChatMessagesProps) {
  const [imageLoading, setImageLoading] = useState<{[key: string]: boolean}>({});
  const [imageError, setImageError] = useState<{[key: string]: boolean}>({});

  const startImageLoad = useCallback((imageUrl: string) => {
    console.log('Starting load for:', imageUrl);
    setImageLoading(prev => ({ ...prev, [imageUrl]: true }));
  }, []);

  const handleImageLoad = useCallback((imageUrl: string) => {
    console.log('Completed load for:', imageUrl);
    setImageLoading(prev => ({ ...prev, [imageUrl]: false }));
    setImageError(prev => ({ ...prev, [imageUrl]: false }));
  }, []);

  const handleImageError = useCallback((imageUrl: string) => {
    console.log('Error loading:', imageUrl);
    setImageLoading(prev => ({ ...prev, [imageUrl]: false }));
    setImageError(prev => ({ ...prev, [imageUrl]: true }));
  }, []);

  // Log messages on mount and updates
  useEffect(() => {
    console.log('Messages updated:', messages.map(msg => ({
      role: msg.role,
      hasImage: !!msg.imageUrl,
      hasImages: !!msg.images,
      imageUrl: msg.imageUrl,
      images: msg.images && {
        existing: msg.images.existing,
        new: msg.images.new
      }
    })));
  }, [messages]);

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        if (message.imageUrl || message.images) {
          console.log('Rendering message with images:', {
            index,
            imageUrl: message.imageUrl,
            images: message.images
          });
        }
        
        return (
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
              
              {/* Single image preview with accessibility */}
              {message.imageUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="mt-2 relative w-48 h-64 cursor-pointer hover:opacity-90 transition-opacity">
                      <ImageWithLoading 
                        src={message.imageUrl} 
                        alt="Book cover"
                        onLoadStart={startImageLoad}
                        onLoadComplete={handleImageLoad}
                        onError={handleImageError}
                      />
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-none bg-transparent">
                    <DialogTitle className="sr-only">Book Cover Image</DialogTitle>
                    <DialogDescription className="sr-only">
                      Enlarged view of the book cover
                    </DialogDescription>
                    <div className="relative w-[90vw] h-[90vh] bg-background rounded-lg overflow-hidden">
                      <ImageWithLoading 
                        src={message.imageUrl} 
                        alt="Book cover"
                        onLoadStart={startImageLoad}
                        onLoadComplete={handleImageLoad}
                        onError={handleImageError}
                      />
                      <DialogClose className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </DialogClose>
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {/* Side by side image comparison with accessibility */}
              {message.images && (
                <div className="mt-2 flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="relative w-48 h-64 cursor-pointer hover:opacity-90 transition-opacity">
                        <ImageWithLoading 
                          src={message.images.existing} 
                          alt="Existing book cover"
                          onLoadStart={startImageLoad}
                          onLoadComplete={handleImageLoad}
                          onError={handleImageError}
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center rounded-b-md">
                          Existing
                        </span>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogTitle className="sr-only">Existing Book Cover</DialogTitle>
                      <DialogDescription className="sr-only">
                        Enlarged view of the existing book cover
                      </DialogDescription>
                      <div className="relative w-[90vw] h-[90vh] bg-background rounded-lg overflow-hidden">
                        <ImageWithLoading 
                          src={message.images.existing} 
                          alt="Existing book cover"
                          onLoadStart={startImageLoad}
                          onLoadComplete={handleImageLoad}
                          onError={handleImageError}
                        />
                        <DialogClose className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="relative w-48 h-64 cursor-pointer hover:opacity-90 transition-opacity">
                        <ImageWithLoading 
                          src={message.images.new} 
                          alt="New book cover"
                          onLoadStart={startImageLoad}
                          onLoadComplete={handleImageLoad}
                          onError={handleImageError}
                        />
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center rounded-b-md">
                          New
                        </span>
                      </div>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogTitle className="sr-only">New Book Cover</DialogTitle>
                      <DialogDescription className="sr-only">
                        Enlarged view of the new book cover
                      </DialogDescription>
                      <div className="relative w-[90vw] h-[90vh] bg-background rounded-lg overflow-hidden">
                        <ImageWithLoading 
                          src={message.images.new} 
                          alt="New book cover"
                          onLoadStart={startImageLoad}
                          onLoadComplete={handleImageLoad}
                          onError={handleImageError}
                        />
                        <DialogClose className="absolute right-4 top-4 z-50 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
                          <X className="h-4 w-4" />
                          <span className="sr-only">Close</span>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              <span className="text-xs opacity-50 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
} 