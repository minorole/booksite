"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, ImagePlus, Bot, User, Info, Expand, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { FILE_CONFIG } from '@/lib/admin/constants'
import { 
  type Message, 
  type MessageContent,
  type AllowedMimeType,
  type ChatResponse 
} from '@/lib/admin/types'
import { Dialog, DialogContent } from "@/components/ui/dialog"

const MESSAGE_STYLES = {
  user: {
    container: "bg-primary text-primary-foreground",
    icon: "bg-primary-foreground/10 text-primary-foreground",
    component: <User className="w-4 h-4" />
  },
  assistant: {
    container: "bg-blue-100 text-blue-900",
    icon: "bg-blue-200 text-blue-700",
    component: <Bot className="w-4 h-4" />
  },
  system: {
    container: "bg-muted text-muted-foreground",
    icon: "bg-muted-foreground/20 text-muted-foreground",
    component: <Info className="w-4 h-4" />
  }
} as const;

export function ChatInterface() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const abortController = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  useEffect(() => {
    return () => abortController.current?.abort()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const lastMessage = messages[messages.length - 1]
    const isImageMessage = lastMessage?.content && Array.isArray(lastMessage.content)
    if (!isImageMessage && !input.trim() && !loading) return

    const userMessage: Message = isImageMessage 
      ? lastMessage 
      : { 
          role: 'user' as const,
          content: input 
        }
    
    setMessages(prev => isImageMessage ? prev : [...prev, userMessage])
    setInput("")
    setLoading(true)
    setError(null)

    try {
      // First request - get LLM's analysis and function call
      const response = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, ...(isImageMessage ? [] : [userMessage])] }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      console.log('📥 Received response:', data)

      // Add the assistant's message
      if (data.message) {
        setMessages(prev => [...prev, data.message])

        // If there's a function call, execute it and add the result
        if (data.message.tool_calls) {
          const toolCall = data.message.tool_calls[0]
          
          // Execute the function
          const functionResult = await fetch('/api/admin/function-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: toolCall.function.name,
              arguments: toolCall.function.arguments
            }),
          })

          if (!functionResult.ok) {
            throw new Error('Function execution failed')
          }

          const result = await functionResult.json()
          console.log('📥 Function result:', result)

          // Add function result as tool message
          const toolMessage: Message = {
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          }

          setMessages(prev => [...prev, toolMessage])

          // Get final response from LLM about the function result
          const finalResponse = await fetch('/api/admin/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              messages: [...messages, data.message, toolMessage]
            }),
          })

          if (!finalResponse.ok) {
            throw new Error('Failed to get final response')
          }

          const finalData = await finalResponse.json()
          if (finalData.message) {
            setMessages(prev => [...prev, finalData.message])
          }
        }
      }

    } catch (error) {
      console.error('❌ Error in chat interface:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('📁 Selected file:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    })

    // Validate file
    if (!FILE_CONFIG.ALLOWED_TYPES.includes(file.type as AllowedMimeType)) {
      setError('Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed.')
      return
    }

    if (file.size > FILE_CONFIG.MAX_SIZE) {
      setError('File too large. Maximum size is 10MB.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Upload image
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const { url: cloudinaryUrl } = await uploadResponse.json()
      console.log('📤 Image uploaded:', cloudinaryUrl)
      
      // Create image message with the actual Cloudinary URL
      const imageMessage: Message = {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: cloudinaryUrl }  // Use actual Cloudinary URL
          },
          {
            type: 'text',
            text: 'Please analyze this book cover image.'
          }
        ]
      }
      
      // Add image message and get analysis
      setMessages(prev => [...prev, imageMessage])
      console.log('🔍 Sending image analysis request')

      // First request - get LLM's analysis and function call
      const analysisResponse = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, imageMessage]
        })
      })

      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze image')
      }

      const data = await analysisResponse.json()
      console.log('📥 Analysis response:', data)

      // Add the assistant's message
      if (data.message) {
        setMessages(prev => [...prev, data.message])

        // If there's a function call, execute it and add the result
        if (data.message.tool_calls) {
          const toolCall = data.message.tool_calls[0]
          
          // Execute the function
          const functionResult = await fetch('/api/admin/function-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              name: toolCall.function.name,
              arguments: toolCall.function.arguments
            }),
          })

          if (!functionResult.ok) {
            throw new Error('Function execution failed')
          }

          const result = await functionResult.json()
          console.log('📥 Function result:', result)

          // Add function result as tool message
          const toolMessage: Message = {
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify(result),
            tool_call_id: toolCall.id
          }

          setMessages(prev => [...prev, toolMessage])

          // Get final response from LLM about the function result
          const finalResponse = await fetch('/api/admin/ai-chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              messages: [...messages, data.message, toolMessage]
            }),
          })

          if (!finalResponse.ok) {
            throw new Error('Failed to get final response')
          }

          const finalData = await finalResponse.json()
          if (finalData.message) {
            setMessages(prev => [...prev, finalData.message])
          }
        }
      }

    } catch (error) {
      console.error('❌ Error:', error)
      setError(error instanceof Error ? error.message : 'Operation failed')
      setMessages(prev => [...prev, {
        role: 'system',
        content: "Sorry, there was an error processing your request."
      }])
    } finally {
      setLoading(false)
    }
  }

  const renderMessageContent = (message: Message) => {
    if (Array.isArray(message.content)) {
      return (
        <div className="space-y-2">
          {message.content.map((content: MessageContent, i) => {
            if (content.type === 'image_url' && content.image_url?.url) {
              const imageUrl = content.image_url.url
              return (
                <div key={i} className="relative group">
                  <img
                    src={imageUrl}
                    alt="Uploaded content"
                    className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedImage(imageUrl)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setSelectedImage(imageUrl)}
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                </div>
              )
            }
            return content.type === 'text' && <p key={i}>{content.text}</p>
          })}
        </div>
      )
    }

    if (message.tool_calls) {
      const toolCall = message.tool_calls[0]
      if (toolCall.function.name === 'analyze_book_and_check_duplicates') {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          return (
            <div className="space-y-2">
              <p>Let me analyze this book cover for you:</p>
              <div className="pl-4 border-l-2 border-primary/20 space-y-1">
                <p>Title (Chinese): {args.book_info.title_zh}</p>
                {args.book_info.title_en && (
                  <p>Title (English): {args.book_info.title_en}</p>
                )}
                <p>Category: {args.book_info.category_type} ({
                  args.book_info.category_type === 'PURE_LAND_BOOKS' ? '净土佛书' :
                  args.book_info.category_type === 'OTHER_BOOKS' ? '其他佛书' :
                  args.book_info.category_type === 'DHARMA_ITEMS' ? '法宝' : '佛像'
                })</p>
                <p>Tags: {args.book_info.tags.join(', ')}</p>
              </div>
              <p>I'm checking our database for any similar books...</p>
            </div>
          )
        } catch (error) {
          console.error('Error parsing function arguments:', error)
          return <p>{message.content || 'Analyzing book...'}</p>
        }
      }
    }

    if (message.role === 'tool') {
      try {
        const content = message.content ? JSON.parse(message.content) : null
        if (content?.analysis_result) {
          return (
            <div className="space-y-2">
              {content.analysis_result.matches.length > 0 ? (
                <>
                  <p>I found some similar books in our database:</p>
                  {content.analysis_result.matches.map((match: any, i: number) => (
                    <div key={i} className="pl-4 border-l-2 border-primary/20 space-y-1">
                      <p>Title: {match.book.title_zh}</p>
                      {match.book.title_en && <p>English Title: {match.book.title_en}</p>}
                      <p>Similarity: {Math.round(
                        (match.visual_similarity.layout + match.visual_similarity.content) * 50
                      )}%</p>
                      {Object.entries(match.differences).map(([key, value]) => 
                        value && <p key={key}>Different {key}</p>
                      )}
                    </div>
                  ))}
                  <p>Would you like to:</p>
                  <ol className="list-decimal list-inside pl-4">
                    <li>Create as new listing</li>
                    <li>Update existing listing</li>
                    <li>Cancel operation</li>
                  </ol>
                </>
              ) : (
                <p>No similar books found in our database. Would you like to create this as a new listing?</p>
              )}
            </div>
          )
        }
        return <p>{message.content}</p>
      } catch {
        return <p>{message.content}</p>
      }
    }

    return <p>{message.content}</p>
  }

  const handleRefresh = () => {
    if (loading) {
      abortController.current?.abort()
    }
    setMessages([])
    setInput("")
    setError(null)
    console.log('🔄 Starting new conversation session')
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-[95%] sm:max-w-[90%] md:max-w-[85%] mx-auto">
      {error && (
        <div className="p-4 mb-4 text-red-500 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-end p-4">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-6 scroll-smooth">
        {messages.map((message, i) => {
          const style = MESSAGE_STYLES[message.role as keyof typeof MESSAGE_STYLES] || MESSAGE_STYLES.system
          return (
            <div key={i} className={cn("flex gap-3 p-4 rounded-lg", style.container)}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", style.icon)}>
                {style.component}
              </div>
              <div className="flex-1 space-y-2 overflow-hidden whitespace-pre-line">
                {renderMessageContent(message)}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[3rem] max-h-[20rem] pr-24 resize-none bg-background w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <div className="absolute right-2 bottom-2 flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept={FILE_CONFIG.ACCEPT_STRING}
                onChange={handleImageUpload}
              />
              <Button
                type="button"
                size="icon"
                variant="default"
                className="h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Button 
                type="submit" 
                size="icon"
                className="h-8 w-8"
                disabled={loading || !input.trim()}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <Dialog open={selectedImage !== null} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-transparent border-0">
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Full size content"
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl" 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 