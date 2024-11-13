import { useReducer, useRef, FormEvent } from 'react';
import { ChatMessage, ChatState, ChatAction, FileUpload } from './types';
import { ChatMessageItem } from './chat-message';
import { FileUploadButton } from './file-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const initialState: ChatState = {
  messages: [
    {
      role: 'assistant',
      content: 'Hello! Would you like to update inventory or add a new book listing?',
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
      let base64Image: string | undefined;
      if (state.currentUpload) {
        base64Image = await convertToBase64(state.currentUpload.file);
      }

      const response = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          image: base64Image
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      
      // Add AI response with both analysis and image URL
      let content = data.message;
      if (data.bookInfo) {
        content += `\n\n${JSON.stringify(data.bookInfo, null, 2)}`;
        if (data.imageUrl) {
          content += `\n\nImage has been uploaded and is available at: ${data.imageUrl}`;
        }
      }

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          role: 'assistant',
          content,
          timestamp: new Date(),
        },
      });

      // Clear upload after processing
      if (state.currentUpload) {
        dispatch({ type: 'SET_UPLOAD', payload: null });
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
} 