import { NextResponse } from 'next/server';
import { LLMManager } from '@/lib/admin/ai/llm-manager';
import { ContextBuilder } from '@/lib/admin/ai/context-builder';
import { adminLogService } from '@/lib/admin/services/admin-log-service';
import { AppError } from '@/lib/admin/utils/error-handler';
import { prisma } from '@/lib/prisma';
import { bookService } from '@/lib/admin/services/book-service';
import type { ChatMessage, BookAnalysis } from '@/types/admin/chat';

// Add detailed logging
const log = {
  api: (message: string, data?: any) => {
    console.log(`🌐 [API] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  },
  error: (message: string, error: any) => {
    console.error(`❌ [API Error] ${message}`, error)
  },
  llm: (message: string, data?: any) => {
    console.log(`🤖 [LLM] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    log.api('Received request:', body)

    // Initialize LLM manager
    const llmManager = new LLMManager(undefined, 'INVENTORY_MANAGEMENT')

    // Handle image analysis
    if (body.type === 'image_analysis' && body.imageUrl) {
      log.api('Processing image analysis:', body.imageUrl)
      
      try {
        const analysis = await llmManager.processImage(body.imageUrl, body.previousMessages)
        
        return NextResponse.json({
          content: 'I analyzed the book cover. Here are my findings. Would you like to modify any details before creating the book listing?',
          timestamp: new Date(),
          analysis,
          metadata: {
            confidence_scores: analysis.confidence_scores,
            analysis_type: 'IMAGE_ANALYSIS'
          }
        })
      } catch (error) {
        log.error('Image analysis failed:', error)
        return NextResponse.json({ 
          error: 'Failed to analyze image',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { 
          status: 500 
        })
      }
    }

    // Handle book creation
    if (body.message?.toLowerCase().includes('create') || body.action === 'CREATE_BOOK') {
      try {
        // Ask LLM for final book data based on conversation
        const response = await llmManager.processMessage(
          "Based on our discussion, what is the final book data we should use to create the listing? Include all modifications we discussed.",
          body.previousMessages
        )

        // Create book using LLM's final data
        const book = await bookService.createBook(response.bookData)

        return NextResponse.json({
          success: true,
          book,
          content: "Book listing created successfully! Would you like to make any other changes?",
          timestamp: new Date()
        })

      } catch (error) {
        log.error('Book creation failed:', error)
        return NextResponse.json({ 
          error: 'Failed to create book',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { 
          status: 500 
        })
      }
    }

    // Regular message processing
    const response = await llmManager.processMessage(body.message, body.previousMessages)
    
    return NextResponse.json({
      content: response.content,
      timestamp: new Date(),
      metadata: response.metadata,
      language: response.language
    })

  } catch (error) {
    log.error('Request failed:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500 
    })
  }
} 