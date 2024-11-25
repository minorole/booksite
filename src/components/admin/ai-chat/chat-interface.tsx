"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, ImagePlus, Bot, User, Info, Expand, RefreshCw, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  FILE_CONFIG, 
  ANALYSIS_MESSAGES, 
  type Message, 
  type MessageContent,
  type AllowedMimeType 
} from '@/lib/admin/constants'
import { Dialog, DialogContent } from "@/components/ui/dialog"

// Add type for URL extraction function
type UrlExtractor = (text: string) => string[];

// Move URL extraction function outside component to avoid redeclaration
const extractUrlsFromText: UrlExtractor = (text) => {
  const patterns = [
    /\[.*?\]\((https?:\/\/[^\s)]+)\)/g,  // Markdown links
    /(?:cover_image:|image_url:)\s*(https?:\/\/[^\s]+)/g  // Plain URLs
  ];

  const urls: string[] = [];
  patterns.forEach(pattern => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      urls.push(match[1]);
    }
  });
  return urls;
};

export function ChatInterface() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingTimerRef = useRef<NodeJS.Timeout>();
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, { role: 'system', content }]);
  };

  const updateThinkingMessage = () => {
    setMessages(prev => prev.map(msg => 
      typeof msg.content === 'string' && msg.content === "Assistant is thinking..." 
        ? { ...msg, content: "Assistant is thinking hard..." }
        : msg
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    addSystemMessage("Assistant is thinking...");

    thinkingTimerRef.current = setTimeout(updateThinkingMessage, 4000);

    try {
      const response = await fetch('/api/admin/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        addSystemMessage("Sorry, there was an error processing your request.");
        throw new Error(`Failed to get response: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received response:', data);
      
      // Clear the thinking timer
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
      }
      
      // Remove thinking messages with proper type checking
      setMessages(prev => prev.filter(msg => 
        !(typeof msg.content === 'string' && msg.content.includes("Assistant is thinking"))
      ));
      
      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      console.error('Error in chat interface:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
    } finally {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
      }
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    console.log('📁 Selected file:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
    })

    // Validate file type
    if (!FILE_CONFIG.ALLOWED_TYPES.includes(file.type as AllowedMimeType)) {
      console.log('❌ Invalid file type:', file.type)
      addSystemMessage("Invalid file type. Only JPEG, PNG, WebP, and HEIC images are allowed.")
      return
    }

    // Validate file size
    if (file.size > FILE_CONFIG.MAX_SIZE) {
      console.log('❌ File too large:', `${(file.size / 1024 / 1024).toFixed(2)}MB`)
      addSystemMessage("File too large. Maximum size is 10MB.")
      return
    }

    try {
      console.log('🚀 Starting upload process...')
      addSystemMessage("Processing image...")
      setLoading(true)
      
      const formData = new FormData()
      formData.append('file', file)
      
      console.log('📤 Sending file to upload API...')
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Upload API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(errorData.error || 'Upload failed')
      }

      const { url: cloudinaryUrl } = await response.json()
      console.log('✅ Upload successful:', { cloudinaryUrl })
      
      // Add image message to chat with explicit instruction about the URL
      const imageMessage: Message = {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: cloudinaryUrl }
          },
          {
            type: 'text',
            text: `Please analyze this book cover image. Note: The cover image URL is ${cloudinaryUrl}`
          }
        ]
      }
      
      // Remove the processing message
      setMessages(prev => prev.filter(msg => 
        !(typeof msg.content === 'string' && msg.content === "Processing image...")
      ))

      // Add the image message and send to API
      setMessages(prev => [...prev, imageMessage])
      
      // Add initial analysis message
      addSystemMessage("GPT-4o is analyzing the image...")
      
      // Set up analysis progress messages
      let messageIndex = 0
      const analysisMessages = ANALYSIS_MESSAGES
      
      const progressTimer = setInterval(() => {
        if (messageIndex < analysisMessages.length) {
          setMessages(prev => prev.map(msg => 
            typeof msg.content === 'string' && 
            msg.content.includes("GPT-4o is") ? 
            { ...msg, content: analysisMessages[messageIndex] } : 
            msg
          ))
          messageIndex++
        }
      }, 4000)
      
      // Use the existing handleSubmit logic
      try {
        const response = await fetch('/api/admin/ai-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [...messages, imageMessage]
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to get response: ${response.status}`)
        }

        const data = await response.json()
        clearInterval(progressTimer)
        
        // Remove the analysis progress message
        setMessages(prev => prev.filter(msg => 
          !(typeof msg.content === 'string' && msg.content.includes("GPT-4o is"))
        ))
        
        setMessages(prev => [...prev, data.message])
      } catch (error) {
        clearInterval(progressTimer)
        console.error('Error processing image:', error)
        addSystemMessage("Failed to process image. Please try again.")
      }
      
    } catch (error) {
      console.error('❌ Image upload error:', error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : error)
      addSystemMessage(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
      }
    };
  }, []);

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'assistant':
        return <Bot className="w-4 h-4" />;
      case 'system':
        return <Info className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getMessageStyle = (role: string) => {
    switch (role) {
      case 'user':
        return "bg-primary text-primary-foreground";
      case 'assistant':
        return "bg-blue-100 text-blue-900";
      case 'system':
        return "bg-muted text-muted-foreground";
      default:
        return "";
    }
  };

  const getIconStyle = (role: string) => {
    switch (role) {
      case 'user':
        return "bg-primary-foreground/10 text-primary-foreground";
      case 'assistant':
        return "bg-blue-200 text-blue-700";
      case 'system':
        return "bg-muted-foreground/20 text-muted-foreground";
      default:
        return "";
    }
  };

  // Add refresh function
  const handleRefresh = () => {
    if (loading) return;
    
    setMessages([]);
    setInput("");
    console.log('🔄 Starting new conversation session');
  };

  // Update the renderMessageContent function to handle the new format
  const renderMessageContent = (content: string | MessageContent[] | null) => {
    if (!content) {
      return null;
    }

    if (typeof content === 'string') {
      // Split content into sections (one section per book)
      const sections = content.split(/(?=\*\*[^*]+\*\*)/);
      
      return (
        <div className="whitespace-pre-wrap text-sm sm:text-base break-words">
          {sections.map((section: string, sectionIndex: number) => {
            // Extract book ID if present - updated regex to match new format
            const bookIdMatch = section.match(/(?:ID: |Found book \(ID: )([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)?/);
            const bookId = bookIdMatch ? bookIdMatch[1] : null;

            // Extract URLs for images
            const urls = extractUrlsFromText(section);
            const textParts = section.split(/\bhttps?:\/\/[^\s]+/g);
            
            return (
              <div key={`section-${sectionIndex}`} className={cn(
                "mb-6 rounded-lg",
                bookId ? "border border-border p-4" : "" // Add border for book info sections
              )}>
                {/* Book ID display with improved visibility */}
                {bookId && (
                  <div className="text-xs bg-muted/50 px-2 py-1 rounded mb-2 font-mono">
                    Book ID: {bookId}
                  </div>
                )}
                
                {/* Main content with better formatting for state changes */}
                <div className={cn(
                  "prose prose-sm dark:prose-invert max-w-none",
                  "prose-headings:mb-2 prose-headings:mt-1",
                  "prose-p:my-1 prose-p:leading-relaxed",
                  "prose-li:my-0.5"
                )}>
                  {textParts.map((part: string, i: number) => {
                    // Highlight state changes
                    const isStateChange = part.includes("Updated tags from") || 
                                       part.includes("Created book") ||
                                       part.includes("Found book");
                    return (
                      <span 
                        key={`text-${sectionIndex}-${i}`}
                        className={cn(
                          isStateChange && "text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {part}
                      </span>
                    );
                  })}
                </div>
                
                {/* Images grid */}
                {urls.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {urls.map((url: string, index: number) => (
                      <div key={`img-${sectionIndex}-${index}`} className="relative group">
                        <div className="relative aspect-[3/4] overflow-hidden rounded-lg cursor-pointer 
                                    hover:ring-2 hover:ring-primary/50 transition-all duration-200">
                          <img 
                            src={url} 
                            alt="Book cover"
                            className="w-full h-full object-cover" 
                            onClick={() => setSelectedImage(url)}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 
                                      flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Expand className="w-6 h-6 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status indicators */}
                {section.includes("successfully") && (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Operation successful
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    // Handle MessageContent[] type (for image uploads)
    return (
      <>
        {content.map((item: MessageContent, index: number) => {
          if (item.type === 'image_url' && item.image_url?.url) {
            const imageUrl = item.image_url.url; // Extract URL with optional chaining
            return (
              <div key={`img-${index}`} className="relative group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-lg cursor-pointer 
                              hover:ring-2 hover:ring-primary/50 transition-all duration-200">
                  <img 
                    src={imageUrl} 
                    alt="Book cover"
                    className="w-full h-full object-cover" 
                    onClick={() => setSelectedImage(imageUrl)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 
                                flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Expand className="w-6 h-6 text-white drop-shadow-lg" />
                  </div>
                </div>
              </div>
            );
          }
          if (item.type === 'text' && item.text) {
            return (
              <p key={`text-${index}`} className="whitespace-pre-wrap text-sm sm:text-base break-words">
                {item.text}
              </p>
            );
          }
          return null;
        })}
      </>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-[95%] sm:max-w-[90%] md:max-w-[85%] mx-auto">
      {/* Add refresh button at the top */}
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
        <div className="max-w-2xl mx-auto w-full space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className="flex flex-col items-center"
            >
              <div className={cn(
                "w-full sm:w-[95%] rounded-2xl px-4 py-3 shadow-sm",
                getMessageStyle(message.role)
              )}>
                <div className="flex items-start gap-3">
                  {message.role === 'user' && (
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center mt-0.5",
                      getIconStyle(message.role),
                      "shrink-0"
                    )}>
                      {getMessageIcon(message.role)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {renderMessageContent(message.content)}
                  </div>
                  {message.role !== 'user' && (
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center mt-0.5",
                      getIconStyle(message.role),
                      "shrink-0"
                    )}>
                      {getMessageIcon(message.role)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && !messages.some(m => m.content === "Assistant is thinking...") && (
            <div className="flex flex-col items-center">
              <div className="w-full sm:w-[95%] bg-muted rounded-2xl px-4 py-3 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex justify-center">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-muted-foreground/20 flex items-center justify-center mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
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
                  e.preventDefault();
                  handleSubmit(e);
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
  );
} 