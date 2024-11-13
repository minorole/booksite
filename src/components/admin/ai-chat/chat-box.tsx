import { useReducer, useRef, FormEvent } from 'react';
import { ChatMessage, ChatState, ChatAction, FileUpload } from './types';
import { ChatMessageItem } from './chat-message';
import { FileUploadButton } from './file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const initialState: ChatState = {
  messages: [
    {
      role: 'assistant',
      content: 'Hello! Would you like to add a new book or update existing inventory?',
      timestamp: new Date(),
    },
  ],
  isProcessing: false,
  currentUpload: null,
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
    case 'SET_UPLOAD':
      return {
        ...state,
        currentUpload: action.payload,
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const input = inputRef.current?.value.trim();
    if (!input && !state.currentUpload) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: input || 'Uploaded a book image',
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

    // Clear input
    if (inputRef.current) inputRef.current.value = '';
    dispatch({ type: 'SET_PROCESSING', payload: true });

    try {
      let response;
      
      if (state.currentUpload) {
        // Handle image upload and processing
        const base64Image = await convertToBase64(state.currentUpload.file);
        
        const [bookAnalysis, uploadResult] = await Promise.all([
          fetch('/api/admin/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              image: base64Image,
              message: input 
            }),
          }).then(res => res.json()),
          fetch('/api/admin/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image }),
          }).then(res => res.json())
        ]);

        // Format the response message
        const analysisMessage = `Book Analysis Results:
        
Title (English): ${bookAnalysis.title_en}
Title (Chinese): ${bookAnalysis.title_zh || 'Not detected'}
        
English Description:
${bookAnalysis.description_en}
        
Chinese Description:
${bookAnalysis.description_zh}
        
Tags: ${bookAnalysis.search_tags.join(', ')}
Suggested Categories: ${bookAnalysis.category_suggestions.join(', ')}
        
Image URL: ${uploadResult.imageUrl}

Would you like me to create a new book listing with this information?`;

        response = { message: analysisMessage };
      } else {
        // Handle text-only chat
        response = await fetch('/api/admin/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input }),
        }).then(res => res.json());
      }

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content: response.message,
          timestamp: new Date(),
        },
      });

      // Clear upload after processing
      if (state.currentUpload) {
        dispatch({ type: 'SET_UPLOAD', payload: null });
      }
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

  const handleFileSelect = (upload: FileUpload) => {
    dispatch({ type: 'SET_UPLOAD', payload: upload });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[600px] flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.messages.map((message, index) => (
          <ChatMessageItem key={index} message={message} />
        ))}
        {state.currentUpload && (
          <div className="flex justify-center">
            <img 
              src={state.currentUpload.previewUrl} 
              alt="Book preview" 
              className="max-w-xs rounded-lg shadow-md"
            />
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="border-t p-4 space-y-4">
        <FileUploadButton onFileSelect={handleFileSelect} />
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            disabled={state.isProcessing}
          />
          <Button type="submit" disabled={state.isProcessing}>
            {state.isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Send'
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
} 