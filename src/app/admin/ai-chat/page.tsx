import { ChatInterface } from "@/components/admin/ai-chat/chat-interface"
import { ScrollArea } from "@/components/ui/scroll-area"

export default function AIAssistantPage() {
  return (
    <ScrollArea className="h-[calc(100vh-8rem)]">
      <div className="w-full max-w-5xl mx-auto">
        <ChatInterface />
      </div>
    </ScrollArea>
  )
} 