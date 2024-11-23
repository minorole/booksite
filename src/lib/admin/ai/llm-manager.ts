import { OpenAI } from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { prisma } from '@/lib/prisma'
import { AI_CONSTANTS } from '../constants/ai'
import { SYSTEM_PROMPTS } from './prompt-templates'
import { AppError } from '../utils/error-handler'
import type { 
  BookAnalysis, 
  OrderInfo, 
  MessageMetadata as ChatMessageMetadata,
  ConfidenceScores,
  DuplicateCheck,
  TagSuggestions,
  ChatMessage
} from '@/types/admin/chat'
import type { SessionType, CategoryType } from '@prisma/client'
import { CATEGORY_MAP } from '../constants/categories'
import { bookService } from '../services/book-service'
import { orderService } from '../services/order-service'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Use the centralized MessageMetadata type
type MessageMetadata = ChatMessageMetadata

interface StorableMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: string
  metadata?: MessageMetadata
  language?: string
}

// Add logging utility
const log = {
  llm: (message: string, data?: any) => {
    console.log(`🤖 [LLM] ${message}`, data ? data : '')
  },
  db: (message: string, data?: any) => {
    console.log(`💾 [DB] ${message}`, data ? data : '')
  },
  error: (message: string, error: any) => {
    console.error(`❌ [Error] ${message}`, error)
  },
  session: (message: string, data?: any) => {
    console.log(`📝 [Session] ${message}`, data ? data : '')
  }
}

// Add OpenAI error interface
interface OpenAIError {
  message: string;
  type: string;
  code: string;
  param?: string;
  stack?: string;
}

// Add type guard
function isOpenAIError(error: unknown): error is OpenAIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'type' in error &&
    'code' in error
  );
}

export class LLMManager {
  private messages: StorableMessage[] = []
  private sessionType: SessionType
  private confidenceThreshold: number = 0.8

  constructor(
    sessionType: SessionType = 'GENERAL',
    options?: {
      confidenceThreshold?: number
    }
  ) {
    this.sessionType = sessionType
    this.confidenceThreshold = options?.confidenceThreshold || 0.8
    this.messages = [{
      role: 'system',
      content: SYSTEM_PROMPTS.chatAssistant,
      timestamp: new Date().toISOString()
    }]
  }

  async processMessage(
    message: string,
    previousMessages?: ChatMessage[]
  ): Promise<{
    content: string;
    language: string;
    bookData?: any;  // For book creation
    confidence_scores?: ConfidenceScores;
  }> {
    try {
      log.llm('Processing message:', message)

      // Detect message language
      const language = await this.detectLanguage(message)
      log.llm(`Detected language: ${language}`)

      // Build conversation history
      const conversationHistory = previousMessages ? 
        previousMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp).toISOString(),
          analysis: msg.analysis,
          imageUrl: msg.imageUrl
        })) : []

      // If this is a book creation request, ask LLM for final data
      if (message.toLowerCase().includes('create')) {
        const response = await openai.chat.completions.create({
          model: AI_CONSTANTS.MODEL,
          messages: [
            {
              role: 'system',
              content: SYSTEM_PROMPTS.chatAssistant
            },
            ...conversationHistory.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: this.formatMessageForLLM(msg)
            })),
            {
              role: 'user',
              content: 'Based on our discussion, return the complete book data as JSON, including all modifications we discussed (tags, quantity, etc).'
            }
          ],
          max_tokens: AI_CONSTANTS.MAX_OUTPUT_TOKENS
        })

        const content = response.choices[0].message.content
        if (!content) {
          throw new Error('Empty response from OpenAI')
        }

        // Parse the book data from response
        const bookData = this.parseBookDataFromResponse(content)

        return {
          content: "I've prepared the book data based on our discussion. Would you like me to create the listing now?",
          language,
          bookData,
          confidence_scores: bookData.confidence_scores
        }
      }

      // Regular message processing
      const response = await openai.chat.completions.create({
        model: AI_CONSTANTS.MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.chatAssistant
          },
          ...conversationHistory.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: this.formatMessageForLLM(msg)
          })),
          {
            role: 'user',
            content: message
          }
        ]
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      return {
        content,
        language,
        confidence_scores: {
          title: 1.0,
          language_detection: 1.0,
          category: 1.0,
          tags: 1.0
        }
      }

    } catch (error) {
      log.error('Failed to process message:', error)
      throw new AppError({
        type: 'AI_ERROR',
        message: 'Failed to process message',
        originalError: error
      })
    }
  }

  async processImage(
    imageUrl: string,
    previousMessages?: ChatMessage[]
  ): Promise<BookAnalysis> {
    try {
      log.llm('Starting image analysis...')
      const response = await openai.chat.completions.create({
        model: AI_CONSTANTS.MODEL,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.imageAnalysis
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this book cover and extract all visible information.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: AI_CONSTANTS.MAX_OUTPUT_TOKENS
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      log.llm('Raw response:', content)

      // Parse the analysis
      return this.parseAnalysisResponse(content)

    } catch (error) {
      log.error('Failed to process image:', error)
      throw new AppError({
        type: 'AI_ERROR',
        message: error instanceof Error ? error.message : 'Failed to process image',
        originalError: error
      })
    }
  }

  private async detectLanguage(text: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: AI_CONSTANTS.MODEL,
        messages: [{
          role: 'user',
          content: `Detect language of: ${text}\nRespond with language code only (en/zh)`
        }],
        temperature: 0,
        max_tokens: 10
      })
      return response.choices[0].message.content?.trim().toLowerCase() || 'en'
    } catch (error) {
      console.warn('Language detection failed:', error)
      return 'en' // Default to English on error
    }
  }

  private formatMessageForLLM(msg: ChatMessage): string {
    let content = msg.content

    // Add image context if present
    if (msg.imageUrl) {
      content += `\n[Image: ${msg.imageUrl}]`
    }

    // Add analysis context if present
    if (msg.analysis) {
      content += `\nAnalysis: ${JSON.stringify(msg.analysis)}`
    }

    return content
  }

  private parseBookDataFromResponse(content: string): any {
    try {
      // First try direct JSON parse
      try {
        return JSON.parse(content)
      } catch (parseError) {
        // Try to find JSON in markdown code block
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
        if (!jsonMatch) {
          throw new Error('Invalid response format: No JSON found')
        }

        return JSON.parse(jsonMatch[1])
      }
    } catch (error) {
      log.error('Failed to parse book data:', error)
      throw new AppError({
        type: 'AI_ERROR',
        message: 'Failed to parse book data from response',
        originalError: error
      })
    }
  }

  private parseAnalysisResponse(content: string): BookAnalysis {
    try {
      // First try direct JSON parse
      try {
        return JSON.parse(content)
      } catch (parseError) {
        // Try to find JSON in markdown code block
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/)
        if (!jsonMatch) {
          throw new Error('Invalid response format: No JSON found')
        }

        const jsonStr = jsonMatch[1]
        try {
          const parsed = JSON.parse(jsonStr)
          
          // Ensure required fields exist
          const analysis: BookAnalysis = {
            title_zh: parsed.title_zh || null,
            title_en: parsed.title_en || null,
            author_zh: parsed.author_zh || null,
            author_en: parsed.author_en || null,
            publisher_zh: parsed.publisher_zh || null,
            publisher_en: parsed.publisher_en || null,
            extracted_text: parsed.extracted_text || {
              raw_text: '',
              positions: {
                title: '',
                author: null,
                publisher: null,
                other: []
              }
            },
            confidence_scores: {
              title: parsed.confidence_scores?.title || 0,
              language_detection: parsed.confidence_scores?.language_detection || 0,
              category: parsed.confidence_scores?.category || 0,
              tags: parsed.confidence_scores?.tags || 0
            },
            category_suggestions: parsed.category_suggestions || [],
            search_tags: parsed.search_tags || { zh: [], en: [] },
            content_summary_zh: parsed.content_summary_zh || null,
            content_summary_en: parsed.content_summary_en || null,
            visual_elements: parsed.visual_elements || {
              has_buddha_image: false,
              has_chinese_text: false,
              has_english_text: false,
              cover_style: '',
              dominant_colors: []
            },
            has_english_translation: parsed.has_english_translation || false,
            analysis_type: 'IMAGE_ANALYSIS',
            prompt_version: 1
          }
          
          return analysis
        } catch (nestedParseError) {
          throw new Error('Invalid JSON format in response')
        }
      }
    } catch (error) {
      log.error('Failed to parse analysis response:', error)
      throw new AppError({
        type: 'AI_ERROR',
        message: 'Failed to parse analysis response',
        originalError: error
      })
    }
  }
}

// Export singleton instance
export const llmManager = new LLMManager()
