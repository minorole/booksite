"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ImageIcon, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const VALID_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
]

const MAX_FILE_SIZE = 19 * 1024 * 1024 // 19MB

export interface ChatInputProps {
  onSubmit: (message: string) => void
  onImageUpload: (file: File) => void
  isProcessing: boolean
  placeholder?: string
}

export function ChatInput({ 
  onSubmit, 
  onImageUpload, 
  isProcessing, 
  placeholder = "Type a message..." 
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const message = inputRef.current?.value.trim()
    if (!message) return
    
    onSubmit(message)
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size first
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image size must be less than 19MB')
      return
    }

    try {
      let processedFile: File = file

      // Handle HEIC/HEIF conversion
      if (file.type === 'image/heic' || file.type === 'image/heif' || 
          file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        toast.loading('Converting HEIC image...')
        
        try {
          const heic2any = (await import('heic2any')).default
          
          const blob = await heic2any({
            blob: file,
            toType: 'image/jpeg',
            quality: 0.8
          })

          processedFile = new File(
            [Array.isArray(blob) ? blob[0] : blob],
            file.name.replace(/\.(heic|heif)$/i, '.jpg'),
            { type: 'image/jpeg' }
          )
          toast.dismiss()
        } catch (error) {
          console.error('HEIC conversion error:', error)
          toast.error('Failed to convert HEIC image. Please try uploading a JPEG or PNG instead.')
          return
        }
      }

      // Validate final file type
      if (!VALID_MIME_TYPES.includes(processedFile.type)) {
        toast.error('Please upload a valid image file (JPG, PNG, GIF, WEBP, HEIC)')
        return
      }

      // Send the processed file
      onImageUpload(processedFile)
      e.target.value = "" // Reset input
      
    } catch (error) {
      console.error('Image processing error:', error)
      toast.error('Failed to process image. Please try again.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (but not with Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const message = inputRef.current?.value.trim()
      if (message && !isProcessing) {
        onSubmit(message)
        if (inputRef.current) inputRef.current.value = ""
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageSelect}
        accept={VALID_MIME_TYPES.join(',')}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className={cn(
          "hover:bg-muted transition-colors",
          isProcessing && "opacity-50 cursor-not-allowed"
        )}
        title="Upload image"
      >
        <ImageIcon className="h-5 w-5" />
      </Button>

      <div className="flex-1 flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
        <Input
          ref={inputRef}
          placeholder={isProcessing ? "Processing..." : placeholder}
          disabled={isProcessing}
          onKeyDown={handleKeyDown}
          className={cn(
            "border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0",
            isProcessing && "opacity-50"
          )}
        />
        <Button 
          type="submit" 
          size="icon"
          variant="ghost"
          disabled={isProcessing}
          className={cn(
            "hover:bg-background transition-colors",
            isProcessing && "opacity-50 cursor-not-allowed"
          )}
          title="Send message"
        >
          {isProcessing ? (
            <div className="animate-spin">⟳</div>
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </form>
  )
} 