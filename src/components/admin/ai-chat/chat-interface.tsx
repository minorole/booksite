"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatInput } from "./chat-input"
import { MessageItem } from "./message-item"
import { toast } from "sonner"
import type { ChatMessage } from "@/types/admin/chat"

export function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: "Hello! I can help you manage inventory and process orders. You can upload book images or ask me questions in English or Chinese.",
    timestamp: new Date()
  }])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleImageUpload = async (file: File) => {
    try {
      setIsProcessing(true)
      toast.loading("Processing book cover...")

      // Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) throw new Error('Failed to upload image')
      const uploadResult = await uploadResponse.json()
      const imageUrl = uploadResult.secure_url

      // Add user message with image
      setMessages(prev => [...prev, {
        role: 'user',
        content: 'Uploaded image for analysis',
        imageUrl,
        timestamp: new Date()
      }])

      // Analyze with AI
      const response = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image_analysis',
          imageUrl,
          previousMessages: messages
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze image')
      }
      
      const data = await response.json()

      // Add AI response with analysis
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        analysis: data.analysis,
        imageUrl,
        timestamp: new Date(),
        metadata: {
          confidence_scores: data.metadata?.confidence_scores,
          analysis_type: data.metadata?.analysis_type
        }
      }])

    } catch (error) {
      console.error('Image processing error:', error)
      // Add error message to chat
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error while analyzing the image: ${errorMessage}. Please try again or upload a different image.`,
        timestamp: new Date(),
        metadata: {
          error: true,
          errorType: 'ANALYSIS_ERROR',
          errorDetails: errorMessage
        }
      }])
      toast.error('Failed to analyze image')
    } finally {
      setIsProcessing(false)
      toast.dismiss()
    }
  }

  const handleSubmit = async (message: string) => {
    try {
      // Add user message
      setMessages(prev => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date()
      }])

      setIsProcessing(true)
      
      // Send to AI chat endpoint
      const response = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          previousMessages: messages
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process request')
      }
      
      const data = await response.json()

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        metadata: data.metadata,
        analysis: data.analysis,
        orderInfo: data.orderInfo
      }])

    } catch (error) {
      console.error('Chat error:', error)
      toast.error('Failed to process message. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTagAction = async (tag: string, action: 'approve' | 'reject') => {
    try {
      setIsProcessing(true)

      // Tell LLM about admin's tag decision through natural language
      const message = action === 'approve' 
        ? `I want to approve the tag "${tag}"`
        : `I want to reject the tag "${tag}"`

      // Add admin's decision to chat
      setMessages(prev => [...prev, {
        role: 'user',
        content: message,
        timestamp: new Date()
      }])

      // Send to AI chat endpoint
      const response = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          previousMessages: messages
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process tag action')
      }
      
      const data = await response.json()

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        metadata: data.metadata,
        analysis: data.analysis
      }])

    } catch (error) {
      console.error('Tag action error:', error)
      toast.error('Failed to process tag action. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-10rem)]">
      <ScrollArea className="flex-1 p-4">
        {messages.map((message, index) => (
          <MessageItem 
            key={index}
            message={message}
            showBookPreview={!!(message.analysis?.title_zh || message.analysis?.title_en)}
            onTagAction={handleTagAction}
          />
        ))}
      </ScrollArea>

      <div className="border-t p-4">
        <ChatInput
          onSubmit={handleSubmit}
          onImageUpload={handleImageUpload}
          isProcessing={isProcessing}
          placeholder="Type a message or upload a book cover..."
        />
      </div>
    </Card>
  )
} 