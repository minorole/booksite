"use client"

import { useReducer, useRef, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ChatMessage, BookState } from '@/lib/ai/types';
import { BookCreationState } from '@/lib/state/book-creation-state';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ChatBoxState {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentBookData?: BookState;
  connectionStatus: 'connected' | 'disconnected';
  abortController?: AbortController;
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
};

type ChatAction = 
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_CONNECTION_STATUS'; payload: 'connected' | 'disconnected' }
  | { type: 'UPDATE_BOOK_DATA'; payload: Partial<BookState> }
  | { type: 'ABORT_OPERATION' }
  | { type: 'RESET' };

function chatReducer(state: ChatBoxState, action: ChatAction): ChatBoxState {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        currentBookData: action.payload.bookData ? {
          id: action.payload.bookData.id,
          title_en: action.payload.bookData.title_en ?? null,
          title_zh: action.payload.bookData.title_zh ?? null,
          description_en: action.payload.bookData.description_en ?? '',
          description_zh: action.payload.bookData.description_zh ?? '',
          cover_image: action.payload.bookData.cover_image ?? null,
          quantity: action.payload.bookData.quantity ?? 0,
          search_tags: action.payload.bookData.search_tags ?? [],
          category_id: action.payload.bookData.category_id,
          ai_metadata: action.payload.bookData.ai_metadata,
          extracted_text: action.payload.bookData.extracted_text,
          confidence_score: action.payload.bookData.confidence_score,
          possible_duplicate: action.payload.bookData.possible_duplicate,
          duplicate_reasons: action.payload.bookData.duplicate_reasons,
          category_suggestions: action.payload.bookData.category_suggestions
        } : state.currentBookData
      };
    
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload
      };
    
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.payload,
        isProcessing: action.payload === 'disconnected' ? false : state.isProcessing
      };
    
    case 'UPDATE_BOOK_DATA':
      if (!action.payload) return state;
      
      const updatedBookData: BookState = {
        id: action.payload.id,
        title_en: action.payload.title_en ?? null,
        title_zh: action.payload.title_zh ?? null,
        description_en: action.payload.description_en ?? '',
        description_zh: action.payload.description_zh ?? '',
        cover_image: action.payload.cover_image ?? null,
        quantity: action.payload.quantity ?? 0,
        search_tags: action.payload.search_tags ?? [],
        category_id: action.payload.category_id ?? '',
        ai_metadata: action.payload.ai_metadata ?? null,
        extracted_text: action.payload.extracted_text ?? '',
        confidence_score: action.payload.confidence_score ?? 0,
        possible_duplicate: action.payload.possible_duplicate ?? false,
        duplicate_reasons: action.payload.duplicate_reasons ?? [],
        category_suggestions: action.payload.category_suggestions ?? []
      };

      return {
        ...state,
        currentBookData: updatedBookData
      };
    
    case 'ABORT_OPERATION':
      state.abortController?.abort();
      return {
        ...state,
        isProcessing: false,
        connectionStatus: 'connected'
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

export function ChatBox() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bookState = new BookCreationState(state.currentBookData);
  const { user } = useAuth();
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const handleSubmit = async (message: string) => {
    if (!message?.trim()) {
      return; // Don't send empty messages
    }

    try {
      const abortController = new AbortController();
      dispatch({ type: 'SET_PROCESSING', payload: true });

      // Add user message first
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'user',
          content: message,
          timestamp: new Date(),
        }
      });

      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          previousMessages: state.messages,
          currentBookData: state.currentBookData
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }

      const data = await response.json();

      // Add assistant response
      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: data.message || data.content,
          timestamp: new Date(),
          bookData: data.data?.updatedBook,
          images: data.images
        }
      });

      // Update book data if provided
      if (data.data?.updatedBook) {
        dispatch({
          type: 'UPDATE_BOOK_DATA',
          payload: data.data.updatedBook
        });
      }

    } catch (err) {
      const error = err as Error;
      if (error instanceof Error && error.name === 'AbortError') {
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: 'disconnected' });
      }
      console.error('Error in chat:', error);
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
    }
  };

  const handleImageUpload = async (file: File) => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    
    try {
      const base64Data = await convertToBase64(file);
      
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

      const data = await response.json();
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
    }
  };

  return (
    <Card className="h-[600px] flex flex-col">
      {state.connectionStatus === 'disconnected' && (
        <Alert variant="destructive" className="m-2">
          <AlertTitle>Connection Lost</AlertTitle>
          <AlertDescription>
            Your session has been disconnected. Please refresh the page to start a new session.
          </AlertDescription>
        </Alert>
      )}
      <div className="flex-1 overflow-y-auto p-4">
        <ChatMessages messages={state.messages} />
        <div ref={chatEndRef} />
      </div>

      <div className="border-t p-4">
        <ChatInput
          onSubmit={handleSubmit}
          onImageUpload={handleImageUpload}
          isProcessing={state.isProcessing}
        />
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