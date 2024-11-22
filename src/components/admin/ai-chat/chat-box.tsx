"use client"

import { useReducer, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ChatMessage, BookState } from '@/lib/ai/types';
import { BookCreationState } from '@/lib/state/book-creation-state';
import { ProgressIndicator } from './ProgressIndicator';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import { UPLOAD_CONSTANTS } from '@/lib/constants/upload';

// Add type for valid MIME types
type ValidMimeType = typeof UPLOAD_CONSTANTS.VALID_MIME_TYPES[number];

interface ChatBoxState {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentBookData?: BookState;
  connectionStatus: 'connected' | 'disconnected';
  currentStep: string;
}

const initialState: ChatBoxState = {
  messages: [
    {
      role: 'assistant',
      content: 'Hello! I can help you add new books or update existing inventory.',
      timestamp: new Date(),
    },
  ],
  isProcessing: false,
  connectionStatus: 'connected',
  currentStep: '',
};

type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'UPDATE_MESSAGE'; payload: { index: number; content: string; bookData?: any; images?: any } }
  | { type: 'UPDATE_BOOK_DATA'; payload: Partial<BookState> }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' }
  | { type: 'RESET' }
  | { type: 'SET_CURRENT_STEP'; payload: string };

function chatReducer(state: ChatBoxState, action: ChatAction): ChatBoxState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
      
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg, idx) => {
          if (idx === action.payload.index && msg.role === 'assistant') {
            return {
              ...msg,
              content: action.payload.content,
              ...(action.payload.bookData && { bookData: action.payload.bookData }),
              ...(action.payload.images && { images: action.payload.images })
            };
          }
          return msg;
        })
      };

    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };

    case 'UPDATE_BOOK_DATA':
      if (!action.payload) return state;
      
      const updatedBookData: BookState = {
        id: action.payload.id ?? state.currentBookData?.id,
        title_en: action.payload.title_en ?? state.currentBookData?.title_en ?? null,
        title_zh: action.payload.title_zh ?? state.currentBookData?.title_zh ?? null,
        description_en: action.payload.description_en ?? state.currentBookData?.description_en ?? '',
        description_zh: action.payload.description_zh ?? state.currentBookData?.description_zh ?? '',
        cover_image: action.payload.cover_image ?? state.currentBookData?.cover_image ?? null,
        quantity: action.payload.quantity ?? state.currentBookData?.quantity ?? 0,
        search_tags: action.payload.search_tags ?? state.currentBookData?.search_tags ?? [],
        category_suggestions: action.payload.category_suggestions ?? state.currentBookData?.category_suggestions ?? [],
        extracted_text: action.payload.extracted_text ?? state.currentBookData?.extracted_text ?? {
          raw_text: '',
          positions: {
            title: '',
            other: []
          }
        },
        confidence_scores: action.payload.confidence_scores ?? state.currentBookData?.confidence_scores ?? {
          title: 0,
          language_detection: 0
        },
        possible_duplicate: action.payload.possible_duplicate ?? state.currentBookData?.possible_duplicate ?? false,
        duplicate_reasons: action.payload.duplicate_reasons ?? state.currentBookData?.duplicate_reasons ?? []
      };

      return {
        ...state,
        currentBookData: updatedBookData
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
        isProcessing: action.payload === 'disconnected' ? false : state.isProcessing
      };

    case 'RESET':
      return initialState;

    case 'SET_CURRENT_STEP':
      return {
        ...state,
        currentStep: action.payload
      };

    default:
      return state;
  }
}

export function ChatBox() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bookState = new BookCreationState(state.currentBookData);

  // Auto-scroll effect
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [state.messages]);

  const handleSubmit = async (message: string) => {
    if (!message?.trim()) return;

    try {
      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'Processing message...' });

      // Add user message
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date(),
      };
      
      dispatch({
        type: 'ADD_MESSAGE',
        payload: userMessage
      });

      // Add assistant message placeholder
      const assistantMessage = {
        role: 'assistant' as const,
        content: '',
        timestamp: new Date(),
      };

      dispatch({
        type: 'ADD_MESSAGE',
        payload: assistantMessage
      });

      const assistantMessageIndex = state.messages.length + 1;

      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          previousMessages: [...state.messages, userMessage],
          currentBookData: state.currentBookData
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let accumulatedMessage = '';
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'Receiving response...' });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        
        try {
          if (chunk.includes('__END_RESPONSE__')) {
            const [content, jsonStr] = chunk.split('__END_RESPONSE__');
            accumulatedMessage += content;
            
            const finalResponse = JSON.parse(jsonStr);
            
            dispatch({
              type: 'UPDATE_MESSAGE',
              payload: {
                index: assistantMessageIndex,
                content: finalResponse.content || accumulatedMessage.trim(),
                bookData: finalResponse.data?.updatedBook,
                images: finalResponse.images
              }
            });

            if (finalResponse.data?.updatedBook) {
              dispatch({
                type: 'UPDATE_BOOK_DATA',
                payload: finalResponse.data.updatedBook
              });
            }
          } else {
            accumulatedMessage += chunk;
            dispatch({
              type: 'UPDATE_MESSAGE',
              payload: {
                index: assistantMessageIndex,
                content: accumulatedMessage.trim()
              }
            });
          }
        } catch (error) {
          console.error('Error processing chunk:', error);
          continue;
        }
      }

    } catch (error) {
      console.error('Error in chat:', error);
      toast.error('Failed to process message. Please try again.');
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date(),
        }
      });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
      dispatch({ type: 'SET_CURRENT_STEP', payload: '' });
    }
  };

  const handleImageUpload = async (file: File) => {
    // Validate file size
    if (file.size > UPLOAD_CONSTANTS.MAX_FILE_SIZE) {
      toast.error(UPLOAD_CONSTANTS.ERROR_MESSAGES.SIZE);
      return;
    }

    // Validate file type with type assertion
    if (!UPLOAD_CONSTANTS.VALID_MIME_TYPES.includes(file.type as ValidMimeType)) {
      toast.error(UPLOAD_CONSTANTS.ERROR_MESSAGES.TYPE);
      return;
    }

    dispatch({ type: 'SET_PROCESSING', payload: true });
    dispatch({ type: 'SET_CURRENT_STEP', payload: 'Uploading image...' });
    
    try {
      const base64Data = await convertToBase64(file);
      
      dispatch({ type: 'SET_CURRENT_STEP', payload: 'Analyzing image with AI...' });
      console.log('Starting image analysis...'); // Debug log
      
      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        body: JSON.stringify({
          image: base64Data,
          previousMessages: state.messages,
          currentBookData: state.currentBookData
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      dispatch({ type: 'SET_CURRENT_STEP', payload: 'Processing results...' });
      const data = await response.json();
      console.log('Image analysis completed:', data.analysis); // Debug log

      if (data.error) throw new Error(data.error);

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          imageUrl: data.imageUrl,
          images: data.images,
          bookData: data.analysis,
        }
      });

    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error(UPLOAD_CONSTANTS.ERROR_MESSAGES.GENERIC);
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing the image. Please try again.',
          timestamp: new Date(),
        }
      });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
      dispatch({ type: 'SET_CURRENT_STEP', payload: '' });
    }
  };

  return (
    <>
      <Toaster position="top-center" />
      <Card className="flex flex-col h-[calc(100vh-12rem)] mx-auto max-w-3xl relative overflow-hidden">
        <div className="flex-1 overflow-y-auto scroll-smooth relative">
          <ChatMessages messages={state.messages} />
          <div ref={chatEndRef} className="h-4" />
        </div>

        <ProgressIndicator 
          currentStep={state.currentStep}
          isProcessing={state.isProcessing}
        />

        <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <ChatInput
            onSubmit={handleSubmit}
            onImageUpload={handleImageUpload}
            isProcessing={state.isProcessing}
          />
        </div>
      </Card>
    </>
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