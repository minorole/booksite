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
  type ChatResponse,
  type ImageUploadResult,
  type ToolCall
} from '@/lib/admin/types'
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { type CategoryType } from '@prisma/client'

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

// Add error message translations
const ERROR_MESSAGES = {
  en: {
    upload_failed: "Failed to upload image",
    analysis_failed: "Failed to analyze image",
    function_failed: "Operation failed",
    network_error: "Network error occurred",
    unknown_error: "An unknown error occurred",
    retry_suggestion: "Please try again",
    invalid_file: "Invalid file type. Only images are allowed.",
    file_too_large: "File too large. Maximum size is 10MB.",
    no_file: "No file selected"
  },
  zh: {
    upload_failed: "图片上传失败",
    analysis_failed: "图片分析失败",
    function_failed: "操作失败",
    network_error: "网络连接错误",
    unknown_error: "发生未知错误",
    retry_suggestion: "请重试",
    invalid_file: "文件类型无效。仅支持图片格式。",
    file_too_large: "文件过大。最大限制为10MB。",
    no_file: "未选择文件"
  }
} as const;

// Add loading state messages
const LOADING_MESSAGES = {
  en: {
    uploading: "Uploading image...",
    analyzing: "Analyzing image...",
    processing: "Processing...",
    checking: "Checking database..."
  },
  zh: {
    uploading: "正在上传图片...",
    analyzing: "正在分析图片...",
    processing: "处理中...",
    checking: "正在检查数据库..."
  }
} as const;

// Add new type for analysis state
interface AnalysisState {
  stage: 'initial' | 'structured' | null
  imageUrl: string | null
  confirmedInfo?: {
    title_zh?: string
    title_en?: string | null
    author_zh?: string | null
    author_en?: string | null
    publisher_zh?: string | null
    publisher_en?: string | null
    category_type?: CategoryType
    quality_issues?: string[]
  }
}

// Add confirmation UI component
const AnalysisConfirmation = ({ 
  analysis: {
    title_zh,
    title_en,
    author_zh,
    author_en,
    publisher_zh,
    publisher_en,
    category_type
  },
  onConfirm,
  onEdit,
  loading
}: {
  analysis: NonNullable<AnalysisState['confirmedInfo']>
  onConfirm: () => void
  onEdit: () => void
  loading: boolean
}) => (
  <div className="mt-4 space-y-4">
    <div className="rounded-lg bg-background/50 p-4 space-y-2">
      <h4 className="font-medium">Please confirm the information:</h4>
      <div className="space-y-1 text-sm">
        <p>Title (Chinese): {title_zh}</p>
        {title_en && <p>Title (English): {title_en}</p>}
        {author_zh && <p>Author (Chinese): {author_zh}</p>}
        {author_en && <p>Author (English): {author_en}</p>}
        {publisher_zh && <p>Publisher (Chinese): {publisher_zh}</p>}
        {publisher_en && <p>Publisher (English): {publisher_en}</p>}
        {category_type && (
          <p>Category: {category_type} ({
            category_type === 'PURE_LAND_BOOKS' ? '净土佛书' :
            category_type === 'OTHER_BOOKS' ? '其他佛书' :
            category_type === 'DHARMA_ITEMS' ? '法宝' : '佛像'
          })</p>
        )}
      </div>
    </div>
    <div className="flex gap-2">
      <Button onClick={onConfirm} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
      </Button>
      <Button variant="outline" onClick={onEdit} disabled={loading}>
        Edit
      </Button>
    </div>
  </div>
);

export function ChatInterface() {
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const abortController = useRef<AbortController | null>(null)
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
  const [loadingState, setLoadingState] = useState<keyof typeof LOADING_MESSAGES['en'] | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    stage: null,
    imageUrl: null
  });

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
      const response = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, ...(isImageMessage ? [] : [userMessage])] }),
      })

      if (!response.ok) {
        throw new Error(ERROR_MESSAGES[language].network_error)
      }

      const data = await response.json()
      console.log('📥 Received response:', data)

      if (data.message) {
        setMessages(prev => [...prev, data.message])

        if (data.message.tool_calls) {
          setLoadingState('processing')
          await handleToolCalls(data.message.tool_calls)
        }
      }

    } catch (error: unknown) {
      console.error('❌ Error in chat interface:', error)
      const errorMessage = error instanceof Error ? 
        error.message : 
        ERROR_MESSAGES[language].unknown_error;
      
      setError(errorMessage)
      setMessages(prev => [...prev, {
        role: 'system',
        content: errorMessage
      }])
    } finally {
      setLoading(false)
      setLoadingState(null)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setError(ERROR_MESSAGES[language].no_file)
      return
    }

    console.log('📁 Selected file:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    })

    setLoading(true)
    setError(null)
    setLoadingState('uploading')

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
        throw new Error(errorData.error || ERROR_MESSAGES[language].upload_failed)
      }

      const { url: cloudinaryUrl } = await uploadResponse.json()
      console.log('📤 Image uploaded:', cloudinaryUrl)
      
      setLoadingState('analyzing')
      
      // Store the URL for later use
      const imageUrl = cloudinaryUrl
      setAnalysisState({ stage: 'initial', imageUrl })
      
      // Create image message with validated URL
      const imageMessage: Message = {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: imageUrl }
          },
          {
            type: 'text',
            text: 'Please analyze this book cover image.'
          }
        ]
      }
      
      // Add image message and get analysis
      setMessages(prev => [...prev, imageMessage])
      console.log('🔍 Sending initial analysis request with URL:', imageUrl)

      // First request - get LLM's natural language analysis
      const analysisResponse = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, imageMessage],
          imageUrl
        })
      })

      if (!analysisResponse.ok) {
        throw new Error(ERROR_MESSAGES[language].analysis_failed)
      }

      const data = await analysisResponse.json()
      console.log('📥 Analysis response:', data)

      // Add the assistant's message
      if (data.message) {
        setMessages(prev => [...prev, data.message])

        // Handle function calls
        if (data.message.tool_calls) {
          setLoadingState('processing')
          await handleToolCalls(data.message.tool_calls, imageUrl)
        }
      }

    } catch (error: unknown) {
      console.error('❌ Error:', error)
      const errorMessage = error instanceof Error ? 
        error.message : 
        ERROR_MESSAGES[language].unknown_error;
      
      setError(errorMessage)
      setMessages(prev => [...prev, {
        role: 'system',
        content: errorMessage
      }])
    } finally {
      setLoading(false)
      setLoadingState(null)
    }
  }

  // New helper function to handle tool calls
  const handleToolCalls = async (toolCalls: ToolCall[], imageUrl?: string) => {
    const currentMessages = [...messages] // Capture current state
    
    for (const toolCall of toolCalls) {
      try {
        console.log('🔧 Handling tool call:', toolCall.function.name)
        setLoadingState('processing')
        
        // If this is an analyze_book_cover call, ensure correct URL
        if (toolCall.function.name === 'analyze_book_cover' && imageUrl) {
          const args = JSON.parse(toolCall.function.arguments)
          args.image_url = imageUrl
          toolCall.function.arguments = JSON.stringify(args)
          console.log('🔧 Using correct image URL for analysis:', imageUrl)
        }
        
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
          const errorData = await functionResult.json()
          throw new Error(errorData.error || ERROR_MESSAGES[language].function_failed)
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

        // Update messages with tool result
        currentMessages.push(toolMessage)
        setMessages([...currentMessages])

        // Get final response about the function result
        const finalResponse = await fetch('/api/admin/ai-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: currentMessages }),
        })

        if (!finalResponse.ok) {
          throw new Error(ERROR_MESSAGES[language].network_error)
        }

        const finalData = await finalResponse.json()
        if (finalData.message) {
          currentMessages.push(finalData.message)
          setMessages([...currentMessages])
        }
      } catch (error: unknown) {
        console.error('❌ Tool call error:', error)
        const errorMessage = error instanceof Error ? 
          error.message : 
          ERROR_MESSAGES[language].function_failed;
        
        setError(errorMessage)
        throw error
      }
    }
  }

  const handleAnalysisConfirmation = async (confirmedInfo: AnalysisState['confirmedInfo']) => {
    if (!analysisState.imageUrl) return;

    setLoading(true)
    setLoadingState('processing')

    try {
      const userMessage: Message = {
        role: 'user',
        content: 'Yes, the information is correct. Please proceed with the analysis.'
      }

      setMessages(prev => [...prev, userMessage])

      // Proceed with structured analysis
      const response = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          imageUrl: analysisState.imageUrl,
          confirmedInfo
        })
      })

      if (!response.ok) {
        throw new Error(ERROR_MESSAGES[language].analysis_failed)
      }

      const data = await response.json()
      console.log('📥 Structured analysis response:', data)

      if (data.message) {
        setMessages(prev => [...prev, data.message])
        setAnalysisState(prev => ({ ...prev, stage: 'structured' }))

        if (data.message.tool_calls) {
          await handleToolCalls(data.message.tool_calls)
        }
      }

    } catch (error) {
      console.error('❌ Error:', error)
      const errorMessage = error instanceof Error ? 
        error.message : 
        ERROR_MESSAGES[language].unknown_error;
      
      setError(errorMessage)
    } finally {
      setLoading(false)
      setLoadingState(null)
    }
  }

  // Update the renderMessageContent function to handle tool responses
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
      if (toolCall.function.name === 'analyze_book_cover') {
        try {
          const args = JSON.parse(toolCall.function.arguments)
          if (args.stage === 'initial') {
            const analysis = args.natural_analysis
            if (!analysis) return <p>Analyzing book...</p>

            return (
              <div className="space-y-2">
                <p>I've analyzed this book cover. Here's what I found:</p>
                <div className="pl-4 border-l-2 border-primary/20 space-y-1">
                  {analysis.title_zh && <p>Title (Chinese): {analysis.title_zh}</p>}
                  {analysis.title_en && <p>Title (English): {analysis.title_en}</p>}
                  {analysis.author_zh && <p>Author (Chinese): {analysis.author_zh}</p>}
                  {analysis.author_en && <p>Author (English): {analysis.author_en}</p>}
                  {analysis.publisher_zh && <p>Publisher (Chinese): {analysis.publisher_zh}</p>}
                  {analysis.publisher_en && <p>Publisher (English): {analysis.publisher_en}</p>}
                  {analysis.category_suggestion && (
                    <p>Suggested Category: {analysis.category_suggestion} ({
                      analysis.category_suggestion === 'PURE_LAND_BOOKS' ? '净土佛书' :
                      analysis.category_suggestion === 'OTHER_BOOKS' ? '其他佛书' :
                      analysis.category_suggestion === 'DHARMA_ITEMS' ? '法宝' : '佛像'
                    })</p>
                  )}
                  {analysis.quality_issues?.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Quality Issues:</p>
                      <ul className="list-disc list-inside">
                        {analysis.quality_issues?.map((issue: string, i: number) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {analysis.needs_confirmation && (
                  <AnalysisConfirmation
                    analysis={analysis}
                    onConfirm={() => handleAnalysisConfirmation(analysis)}
                    onEdit={() => {
                      // TODO: Implement edit UI
                      console.log('Edit requested')
                    }}
                    loading={loading}
                  />
                )}
              </div>
            )
          }
        } catch (error) {
          console.error('Error parsing function arguments:', error)
          return <p>{message.content || 'Analyzing book...'}</p>
        }
      }
    }

    if (message.role === 'tool') {
      try {
        const content = message.content ? JSON.parse(message.content) : null
        if (content?.vision_analysis?.structured_data) {
          return (
            <div className="space-y-2">
              <p>Analysis complete! Here's the structured data:</p>
              <div className="pl-4 border-l-2 border-primary/20 space-y-1">
                <p>Confidence Score: {Math.round(content.vision_analysis.structured_data.confidence_scores.overall * 100)}%</p>
                <p>Language: {content.vision_analysis.structured_data.language_detection.primary_language.toUpperCase()}</p>
                {content.vision_analysis.structured_data.visual_elements.notable_elements.length > 0 && (
                  <p>Notable Elements: {content.vision_analysis.structured_data.visual_elements.notable_elements.join(', ')}</p>
                )}
              </div>
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

  // Helper function for error messages with proper typing
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      const key = error.message.toLowerCase().replace(/\s+/g, '_') as keyof typeof ERROR_MESSAGES['en'];
      return ERROR_MESSAGES[language][key] || ERROR_MESSAGES[language].unknown_error;
    }
    if (typeof error === 'string') {
      const key = error.toLowerCase().replace(/\s+/g, '_') as keyof typeof ERROR_MESSAGES['en'];
      return ERROR_MESSAGES[language][key] || ERROR_MESSAGES[language].unknown_error;
    }
    return ERROR_MESSAGES[language].unknown_error;
  };

  // Update error display component with proper typing
  const ErrorDisplay = ({ error }: { error: string | null }) => {
    if (!error) return null;
    
    return (
      <div className="p-4 mb-4 text-red-500 bg-red-50 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>{error}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setError(null)}
          className="hover:bg-red-100"
        >
          ×
        </Button>
      </div>
    );
  };

  // Update loading state component
  const LoadingIndicator = () => {
    if (!loadingState) return null;

    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{LOADING_MESSAGES[language][loadingState]}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-[95%] sm:max-w-[90%] md:max-w-[85%] mx-auto">
      {error && (
        <ErrorDisplay error={error} />
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

      {loading && (
        <LoadingIndicator />
      )}
    </div>
  )
} 