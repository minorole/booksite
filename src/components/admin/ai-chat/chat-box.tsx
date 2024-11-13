"use client"

import { useReducer, useRef, FormEvent } from 'react';
import { ChatMessage, ChatState, ChatAction } from './types';
import { ChatMessageItem } from './chat-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Image as ImageIcon, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

const initialState: ChatState = {
  messages: [
    {
      role: 'assistant',
      content: 'Hello! I can help you add new books or update existing inventory. You can either send me a message or upload a book image.',
      timestamp: new Date(),
    },
  ],
  isProcessing: false,
  uploadedImageUrl: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload,
      };
    case 'SET_UPLOADED_IMAGE':
      return {
        ...state,
        uploadedImageUrl: action.payload,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function ChatBox() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageUpload = async (file: File) => {
    try {
      dispatch({ type: 'SET_PROCESSING', payload: true });
      
      // Convert HEIC/HEIF to JPEG if needed
      let processedFile = file;
      if (file.type === 'image/heic' || file.type === 'image/heif') {
        try {
          const heic2any = (await import('heic2any')).default;
          const blob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          });
          
          processedFile = new File(
            [Array.isArray(blob) ? blob[0] : blob], 
            file.name.replace(/\.(heic|heif)$/i, '.jpg'),
            { type: 'image/jpeg' }
          );
        } catch (error) {
          console.error('HEIC conversion error:', error);
          throw new Error('Failed to convert HEIC image');
        }
      }

      // Add user message showing image upload
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'user',
          content: 'Uploading book image...',
          timestamp: new Date(),
        },
      });

      // Convert to base64 and send to API
      const base64Data = await convertToBase64(processedFile);
      
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        body: JSON.stringify({
          image: base64Data
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          imageUrl: data.imageUrl,
          analysis: data.analysis,
        },
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing the image. Please try again.',
          timestamp: new Date(),
        },
      });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
      scrollToBottom();
    }
  };

  const handleChatSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input = inputRef.current?.value.trim();
    if (!input) return;

    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        role: 'user',
        content: input,
        timestamp: new Date(),
      },
    });

    if (inputRef.current) inputRef.current.value = '';
    dispatch({ type: 'SET_PROCESSING', payload: true });

    try {
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error in chat:', error);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        },
      });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
      scrollToBottom();
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.messages.map((message, index) => (
          <ChatMessageItem key={index} message={message} />
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t p-4 space-y-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
          accept="image/*"
          className="hidden"
        />
        
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={state.isProcessing}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          <form onSubmit={handleChatSubmit} className="flex-1 flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Type your message..."
              disabled={state.isProcessing}
            />
            <Button type="submit" disabled={state.isProcessing}>
              {state.isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </Card>
  );
}

function convertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
} 