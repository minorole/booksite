import { AppError } from '../utils/error-handler'
import type { BookAnalysis, ImageProcessingResult, ConfidenceScores } from '@/types/admin/chat'
import { Validators } from '../utils/validators'
import { LLMManager } from './llm-manager'

// Add logging utility
const log = {
  image: (message: string, data?: any) => {
    console.log(`📸 [Image] ${message}`, data ? data : '')
  },
  llm: (message: string, data?: any) => {
    console.log(`🤖 [LLM] ${message}`, data ? data : '')
  },
  error: (message: string, error: any) => {
    console.error(`❌ [Image Error] ${message}`, error)
  }
}

export class ImageProcessor {
  private confidenceThreshold: number
  private llmManager: LLMManager

  constructor(confidenceThreshold: number = 0.8) {
    this.confidenceThreshold = confidenceThreshold
    this.llmManager = new LLMManager(undefined, 'INVENTORY_MANAGEMENT', {
      confidenceThreshold
    })
    log.image('Initializing image processor', { confidenceThreshold })
  }

  async processBookCover(imageUrl: string): Promise<ImageProcessingResult> {
    try {
      const startTime = Date.now()
      log.image('Starting book cover analysis from URL:', imageUrl)

      // Process image with LLM for analysis
      log.llm('Starting LLM analysis...')
      const analysis = await this.llmManager.processImage(
        imageUrl,
        []
      )

      // Filter out low confidence suggestions
      const scores = analysis.confidence_scores
      if (scores) {
        log.image('Checking confidence scores:', scores)
        
        if (scores.title < this.confidenceThreshold) {
          log.image('Title confidence too low, removing titles')
          analysis.title_zh = null
          analysis.title_en = null
        }

        if (scores.category < this.confidenceThreshold) {
          log.image('Category confidence too low, removing suggestions')
          analysis.category_suggestions = []
        }

        if (scores.tags < this.confidenceThreshold) {
          log.image('Tag confidence too low, removing suggestions')
          analysis.search_tags = {
            zh: [],
            en: []
          }
        }
      }

      const duration = Date.now() - startTime
      log.image(`Processing completed in ${duration}ms`, {
        hasTitle: !!analysis.title_zh || !!analysis.title_en,
        categoryCount: analysis.category_suggestions?.length,
        tagCount: analysis.search_tags?.zh.length + analysis.search_tags?.en.length
      })

      return {
        displayUrl: imageUrl,
        aiImageData: imageUrl,
        analysis,
        confidence_scores: scores
      }
    } catch (error) {
      log.error('Failed to process book cover:', error)
      throw new AppError({
        type: 'AI_ERROR',
        message: 'Failed to process book cover',
        originalError: error
      })
    }
  }

  async compareImages(imageUrl1: string, imageUrl2: string): Promise<{
    isSame: boolean;
    confidence: number;
    reasons: string[];
  }> {
    try {
      log.image('Comparing images:', { url1: imageUrl1, url2: imageUrl2 })
      
      // Use LLM to analyze both images
      const analysis1 = await this.llmManager.processImage(imageUrl1, [])
      const analysis2 = await this.llmManager.processImage(imageUrl2, [])
      
      // Compare the analyses
      const isSame = analysis1.title_zh === analysis2.title_zh || 
                    analysis1.title_en === analysis2.title_en
      
      const reasons = []
      if (analysis1.title_zh === analysis2.title_zh) {
        reasons.push('Chinese titles match')
      }
      if (analysis1.title_en === analysis2.title_en) {
        reasons.push('English titles match')
      }
      
      log.image('Comparison results:', { isSame, reasons })
      
      return {
        isSame,
        confidence: isSame ? 0.9 : 0.1,
        reasons
      }
    } catch (error) {
      log.error('Failed to compare images:', error)
      throw new AppError({
        type: 'AI_ERROR',
        message: 'Failed to compare images',
        originalError: error
      })
    }
  }

  setConfidenceThreshold(threshold: number) {
    log.image('Updating confidence threshold', {
      old: this.confidenceThreshold,
      new: threshold
    })
    this.confidenceThreshold = threshold
    this.llmManager.setConfidenceThreshold(threshold)
  }

  getConfidenceThreshold(): number {
    return this.confidenceThreshold
  }
}

// Export singleton instance
export const imageProcessor = new ImageProcessor() 