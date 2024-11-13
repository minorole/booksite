import { ChatMessage } from './types';
import { Avatar } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageProps) {
  return (
    <div className={`flex gap-3 ${
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
        <span className="text-xs opacity-50">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
} 