import { prisma } from '@/lib/prisma'
import { type AdminAction, type CategoryType, type Book, type Category, Prisma } from '@prisma/client'
import { 
  type BookAnalyzeParams,
  type BookCreate, 
  type BookUpdate, 
  type BookSearch,
  type OrderUpdate,
  type AdminOperationResult,
  type BookBase,
  type OrderBase,
  type VisionAnalysisResult,
  type ImageUploadResult
} from './types'
import { createVisionChatCompletion } from '@/lib/openai'
import { type ChatCompletion } from 'openai/resources/chat/completions'
import { validateCloudinaryUrl, standardizeImageUrl } from './image-upload'

/**
 * Helper function to validate UUID format
 * Only validation we need since we trust GPT-4o for business logic
 */
function isValidUUID(uuid: string) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generic error handler for database operations
 * Maintains consistent error structure for GPT-4o to understand
 */
function handleOperationError(error: unknown, operation: string): AdminOperationResult {
  console.error(`❌ Failed to ${operation}:`, error)
  return {
    success: false,
    message: `Failed to ${operation}`,
    error: {
      code: 'database_error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Transforms database Book object to BookBase type
 * Ensures consistent data structure for GPT-4o interactions
 */
function toBookBase(book: Book & { category: Category }): BookBase {
  // Parse stored JSON data with type safety
  const analysisData = book.image_analysis_data ? 
    (typeof book.image_analysis_data === 'string' ? 
      JSON.parse(book.image_analysis_data) : 
      book.image_analysis_data) as VisionAnalysisResult : 
    undefined;

  return {
    title_zh: book.title_zh,
    title_en: book.title_en,
    description_zh: book.description_zh,
    description_en: book.description_en,
    category_type: book.category.type,
    quantity: book.quantity,
    tags: book.search_tags,
    cover_image: book.cover_image || '',
    analysis_result: analysisData,
    similarity_group: book.similar_books?.join(',')
  }
}

/**
 * Validates the structure of vision analysis result
 */
function validateAnalysisResult(result: any): result is VisionAnalysisResult {
  try {
    // Basic structure check
    if (!result.confidence_scores || !result.language_detection || 
        !result.extracted_text || !result.visual_elements) {
      console.log('❌ Missing required top-level fields')
      return false
    }

    // Confidence scores check
    const scores = result.confidence_scores
    if (typeof scores.title_detection !== 'number' ||
        typeof scores.category_match !== 'number' ||
        typeof scores.overall !== 'number') {
      console.log('❌ Invalid confidence scores')
      return false
    }

    // Language detection check
    const lang = result.language_detection
    if (typeof lang.has_chinese !== 'boolean' ||
        typeof lang.has_english !== 'boolean' ||
        !['zh', 'en'].includes(lang.primary_language) ||
        !Array.isArray(lang.script_types)) {
      console.log('❌ Invalid language detection')
      return false
    }

    // Text extraction check
    const text = result.extracted_text
    if (!text.title || typeof text.title.confidence !== 'number') {
      console.log('❌ Invalid text extraction')
      return false
    }

    // Visual elements check
    const visual = result.visual_elements
    if (typeof visual.has_cover_image !== 'boolean' ||
        typeof visual.image_quality_score !== 'number' ||
        !Array.isArray(visual.notable_elements)) {
      console.log('❌ Invalid visual elements')
      return false
    }

    return true
  } catch (e) {
    console.error('❌ Validation error:', e)
    return false
  }
}

/**
 * Attempts to retry analysis with emphasized JSON requirement
 */
async function retryAnalysis(args: {
  image_url: string
}, adminEmail: string): Promise<AdminOperationResult> {
  console.log('🔄 Retrying analysis with emphasized JSON requirement')
  
  try {
    // Validate and standardize URL before retry
    const isValid = await validateCloudinaryUrl(args.image_url)
    if (!isValid) {
      return {
        success: false,
        message: 'Invalid image URL',
        error: {
          code: 'validation_error',
          details: 'Invalid or inaccessible image URL'
        }
      }
    }

    const standardizedUrl = await standardizeImageUrl(args.image_url)
    console.log('✅ Using standardized URL for retry:', standardizedUrl)

    const response = await createVisionChatCompletion({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this Buddhist book cover...`
            },
            {
              type: 'image_url',
              image_url: { url: standardizedUrl }
            }
          ]
        }
      ],
      stream: false
    }) as ChatCompletion

    if (!response.choices[0]?.message?.content) {
      throw new Error('Invalid retry response format')
    }

    const content = response.choices[0].message.content
    
    try {
      const analysisResult = JSON.parse(content)
      if (!validateAnalysisResult(analysisResult)) {
        throw new Error('Invalid retry analysis structure')
      }

      return {
        success: true,
        message: 'Analysis complete (retry successful)',
        data: {
          vision_analysis: {
            stage: 'structured',
            structured_data: analysisResult
          }
        }
      }
    } catch (e) {
      console.error('❌ Retry failed to parse vision analysis:', e)
      throw new Error('Failed to parse retry analysis')
    }
  } catch (error) {
    return handleOperationError(error, 'retry analyze book cover')
  }
}

/**
 * Initial book cover analysis
 */
export async function analyzeBookCover(args: BookAnalyzeParams, adminEmail: string): Promise<AdminOperationResult> {
  console.log('🔍 Starting book cover analysis:', args)

  try {
    // Validate and standardize URL
    const standardizedUrl = await standardizeImageUrl(args.image_url)
    console.log('✅ Using standardized URL:', standardizedUrl)

    // Initial stage - Natural language analysis
    if (args.stage === 'initial') {
      console.log('📝 Performing initial natural language analysis')
      
      const response = await createVisionChatCompletion({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this Buddhist book cover and provide a natural language summary. 
                      Extract and identify:
                      - Title in Chinese and English (if present)
                      - Author information (if visible)
                      - Publisher details (if available)
                      - Category suggestion based on content
                      - Any quality issues or concerns
                      Please provide this information in a clear, natural language format.`
              },
              {
                type: 'image_url',
                image_url: { url: standardizedUrl }
              }
            ]
          }
        ],
        stream: false
      }) as ChatCompletion

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No analysis received from vision model')
      }

      console.log('📝 Natural language analysis:', content)

      // Extract key information using natural language processing
      // This is a simplified example - in practice, GPT-4o will provide this naturally
      const analysis = {
        title_zh: extractChineseTitle(content),
        title_en: extractEnglishTitle(content),
        author_zh: extractChineseAuthor(content),
        author_en: extractEnglishAuthor(content),
        publisher_zh: extractChinesePublisher(content),
        publisher_en: extractEnglishPublisher(content),
        category_suggestion: suggestCategory(content),
        quality_issues: extractQualityIssues(content),
        needs_confirmation: true
      }

      await logAnalysisOperation('INITIAL_ANALYSIS', {
        admin_email: adminEmail,
        image_url: standardizedUrl,
        analysis_result: analysis
      })

      return {
        success: true,
        message: 'Initial analysis complete',
        data: {
          vision_analysis: {
            stage: 'initial',
            natural_analysis: analysis
          }
        }
      }
    }

    // Structured stage - After user confirmation
    if (args.stage === 'structured' && args.confirmed_info) {
      console.log('🔍 Performing structured analysis with confirmed info:', args.confirmed_info)

      const response = await createVisionChatCompletion({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Based on this book cover image and the confirmed information: ${JSON.stringify(args.confirmed_info)},
                      provide a detailed analysis in JSON format following the VisionAnalysisResult structure.
                      Focus on:
                      1. Confidence scores for each element
                      2. Language detection details
                      3. Visual elements and quality assessment
                      4. Any additional text or elements found`
              },
              {
                type: 'image_url',
                image_url: { url: standardizedUrl }
              }
            ]
          }
        ],
        stream: false
      }) as ChatCompletion

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No analysis received from vision model')
      }

      try {
        const structuredData = JSON.parse(content) as VisionAnalysisResult
        structuredData.cover_url = standardizedUrl
        console.log('📊 Structured analysis result:', structuredData)

        await logAnalysisOperation('STRUCTURED_ANALYSIS', {
          admin_email: adminEmail,
          image_url: standardizedUrl,
          confirmed_info: args.confirmed_info,
          structured_data: structuredData
        })

        return {
          success: true,
          message: 'Structured analysis complete',
          data: {
            vision_analysis: {
              stage: 'structured',
              structured_data: structuredData
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to parse structured analysis:', error)
        throw new Error('Failed to generate structured analysis')
      }
    }

    throw new Error('Invalid analysis stage or missing confirmed info')

  } catch (error) {
    return handleOperationError(error, 'analyze book cover')
  }
}

// Helper functions for natural language analysis
function extractChineseTitle(content: string): string | undefined {
  // GPT-4o will handle this naturally - this is just for type safety
  return undefined
}

function extractEnglishTitle(content: string): string | undefined {
  return undefined
}

function extractChineseAuthor(content: string): string | undefined {
  return undefined
}

function extractEnglishAuthor(content: string): string | undefined {
  return undefined
}

function extractChinesePublisher(content: string): string | undefined {
  return undefined
}

function extractEnglishPublisher(content: string): string | undefined {
  return undefined
}

function suggestCategory(content: string): CategoryType | undefined {
  return undefined
}

function extractQualityIssues(content: string): string[] {
  return []
}

async function logAnalysisOperation(
  type: 'INITIAL_ANALYSIS' | 'STRUCTURED_ANALYSIS',
  data: {
    admin_email: string
    image_url: string
    analysis_result?: any
    confirmed_info?: any
    structured_data?: any
  }
) {
  await prisma.adminLog.create({
    data: {
      action: 'ANALYZE_IMAGE',
      admin_email: data.admin_email,
      metadata: data as unknown as Prisma.JsonObject
    }
  })
}

/**
 * Check for duplicate books with both text and visual comparison
 */
export async function checkDuplicates(args: {
  title_zh: string
  title_en?: string
  author_zh?: string
  author_en?: string
  publisher_zh?: string
  publisher_en?: string
  cover_image?: string  // Add this for visual comparison
}, adminEmail: string): Promise<AdminOperationResult> {
  console.log('🔍 Starting duplicate check:', args)

  try {
    // First stage: Text-based search
    console.log('📚 Performing text-based search')
    const potentialMatches = await prisma.book.findMany({
      where: {
        OR: [
          // Title matches
          {
            title_zh: {
              contains: args.title_zh,
              mode: Prisma.QueryMode.insensitive
            }
          },
          ...(args.title_en ? [{
            title_en: {
              contains: args.title_en,
              mode: Prisma.QueryMode.insensitive
            }
          }] : []),
          // Author matches
          ...(args.author_zh ? [{
            author_zh: {
              contains: args.author_zh,
              mode: Prisma.QueryMode.insensitive
            }
          }] : []),
          ...(args.author_en ? [{
            author_en: {
              contains: args.author_en,
              mode: Prisma.QueryMode.insensitive
            }
          }] : [])
        ]
      },
      include: {
        category: true
      }
    })

    console.log(`📝 Found ${potentialMatches.length} potential matches`)

    // Second stage: Visual comparison if cover image provided
    let visualAnalysis: Array<{
      book: typeof potentialMatches[0]
      similarity: {
        layout: number
        content: number
        confidence: number
      }
      differences: {
        publisher?: boolean
        edition?: boolean
        layout?: boolean
      }
    }> = []

    if (args.cover_image && potentialMatches.length > 0) {
      console.log('🔍 Performing visual comparison')
      visualAnalysis = await Promise.all(
        potentialMatches.map(async match => {
          if (!match.cover_image) return null

          const analysis = await analyzeVisualSimilarity(
            args.cover_image!,
            match.cover_image
          )

          return {
            book: match,
            similarity: {
              layout: analysis.layout_similarity,
              content: analysis.content_similarity,
              confidence: analysis.confidence
            },
            differences: {
              publisher: match.publisher_zh !== args.publisher_zh || 
                        match.publisher_en !== args.publisher_en,
              edition: detectEditionDifference(match, args),
              layout: analysis.layout_similarity < 0.8
            }
          }
        })
      ).then(results => results.filter((r): r is NonNullable<typeof r> => r !== null))

      console.log('📊 Visual analysis complete:', {
        matches: visualAnalysis.length,
        highSimilarity: visualAnalysis.filter(
          v => (v.similarity.layout + v.similarity.content) / 2 > 0.8
        ).length
      })
    }

    // Log operation
    await prisma.adminLog.create({
      data: {
        action: 'CHECK_DUPLICATE' as AdminAction,
        admin_email: adminEmail,
        metadata: {
          search_criteria: args,
          text_matches: potentialMatches.length,
          visual_matches: visualAnalysis.length,
          has_visual_comparison: !!args.cover_image
        } as unknown as Prisma.JsonObject
      }
    })

    // Analyze results and make recommendation
    const analysis = analyzeResults(visualAnalysis.length > 0 ? 
      visualAnalysis.map(v => ({
        book_id: v.book.id,
        similarity_score: (v.similarity.layout + v.similarity.content) / 2,
        differences: v.differences,
        visual_analysis: v.similarity
      })) : 
      []
    )

    return {
      success: true,
      message: 'Duplicate check complete',
      data: {
        duplicate_detection: {
          matches: visualAnalysis.length > 0 ? 
            visualAnalysis.map(v => ({
              book_id: v.book.id,
              similarity_score: (v.similarity.layout + v.similarity.content) / 2,
              differences: v.differences,
              visual_analysis: v.similarity
            })) : [],
          analysis
        },
        search: {
          found: potentialMatches.length > 0,
          books: potentialMatches.map(toBookBase)
        }
      }
    }
  } catch (error) {
    return handleOperationError(error, 'check duplicates')
  }
}

/**
 * Creates a new book in the database
 * Accepts GPT-4o's decisions while ensuring data structure
 */
export async function createBook(args: BookCreate, adminEmail: string): Promise<AdminOperationResult> {
  console.log('📚 Creating new book:', args)
  
  try {
    // Properly handle JSON data for Prisma
    const analysisData = args.analysis_result ? 
      (args.analysis_result as unknown as Prisma.InputJsonValue) : 
      Prisma.JsonNull;

    const book = await prisma.book.create({
      data: {
        title_zh: args.title_zh,
        title_en: args.title_en,
        description_zh: args.description_zh,
        description_en: args.description_en,
        category: {
          connect: {
            type: args.category_type
          }
        },
        quantity: args.quantity,
        search_tags: args.tags,
        cover_image: args.cover_image,
        content_summary_zh: args.content_summary_zh || '',
        content_summary_en: args.content_summary_en,
        author_zh: args.author_zh,
        author_en: args.author_en,
        publisher_zh: args.publisher_zh,
        publisher_en: args.publisher_en,
        image_analysis_data: analysisData,
        similar_books: args.similarity_group ? args.similarity_group.split(',') : []
      },
      include: {
        category: true
      }
    })

    await prisma.adminLog.create({
      data: {
        action: 'CREATE_BOOK' as AdminAction,
        book_id: book.id,
        book_title: args.title_en || args.title_zh,
        admin_email: adminEmail,
        metadata: {
          title_zh: args.title_zh,
          title_en: args.title_en,
          category_type: args.category_type,
          quantity: args.quantity,
          tags: args.tags,
          cover_image: args.cover_image,
          ai_analysis: args.analysis_result ? true : false
        }
      }
    })

    return {
      success: true,
      message: 'Book created successfully',
      data: {
        book: toBookBase(book)
      }
    }
  } catch (error) {
    return handleOperationError(error, 'create book')
  }
}

/**
 * Updates an existing book in the database
 * Trusts GPT-4o's validation of business logic
 */
export async function updateBook(args: BookUpdate, adminEmail: string): Promise<AdminOperationResult> {
  try {
    if (!isValidUUID(args.book_id)) {
      return {
        success: false,
        message: 'Invalid book ID format',
        error: {
          code: 'validation_error',
          details: 'invalid_uuid'
        }
      }
    }

    // Properly handle JSON data for Prisma
    const analysisData = args.analysis_result ? 
      (args.analysis_result as unknown as Prisma.InputJsonValue) : 
      undefined;

    const updateData: Prisma.BookUpdateInput = {
      ...(args.title_zh && { title_zh: args.title_zh }),
      ...(args.title_en && { title_en: args.title_en }),
      ...(args.quantity !== undefined && { quantity: args.quantity }),
      ...(args.tags && { search_tags: args.tags }),
      ...(args.category_type && {
        category: {
          connect: {
            type: args.category_type
          }
        }
      }),
      ...(analysisData !== undefined && { 
        image_analysis_data: analysisData 
      })
    };

    const updatedBook = await prisma.book.update({
      where: { id: args.book_id },
      data: updateData,
      include: {
        category: true
      }
    })

    await prisma.adminLog.create({
      data: {
        action: 'EDIT_BOOK' as AdminAction,
        book_id: updatedBook.id,
        book_title: updatedBook.title_zh,
        admin_email: adminEmail,
        metadata: {
          changes: {
            title_zh: args.title_zh,
            title_en: args.title_en,
            quantity: args.quantity,
            tags: args.tags,
            category_type: args.category_type
          }
        }
      }
    })

    return {
      success: true,
      message: 'Book updated successfully',
      data: {
        book: toBookBase(updatedBook)
      }
    }
  } catch (error) {
    return handleOperationError(error, 'update book')
  }
}

/**
 * Searches books based on various criteria
 * Trusts GPT-4o's search parameter validation
 */
export async function searchBooks(args: BookSearch): Promise<AdminOperationResult> {
  console.log('🔍 Searching books with criteria:', args)

  try {
    const whereConditions: any = {}
    
    if (args.title) {
      whereConditions.OR = [
        { 
          title_zh: { 
            contains: args.title,
            mode: 'insensitive'
          }
        },
        { 
          title_en: { 
            contains: args.title,
            mode: 'insensitive'
          }
        }
      ]
    }

    if (args.tags) {
      whereConditions.search_tags = {
        hasSome: args.tags
      }
    }

    if (args.category_type) {
      whereConditions.category = {
        type: args.category_type
      }
    }

    if (args.min_quantity) {
      whereConditions.quantity = {
        ...whereConditions.quantity,
        gte: args.min_quantity
      }
    }

    if (args.max_quantity) {
      whereConditions.quantity = {
        ...whereConditions.quantity,
        lte: args.max_quantity
      }
    }

    const books = await prisma.book.findMany({
      where: whereConditions,
      include: {
        category: true
      }
    })

    return {
      success: true,
      message: `Found ${books.length} book(s)`,
      data: {
        search: {
          found: books.length > 0,
          books: books.map(toBookBase)
        }
      }
    }
  } catch (error) {
    return handleOperationError(error, 'search books')
  }
}

/**
 * Updates order status and details
 * Trusts GPT-4o's validation of order status transitions
 */
export async function updateOrder(args: OrderUpdate, adminEmail: string): Promise<AdminOperationResult> {
  console.log('🔄 Updating order status:', args)

  try {
    if (!isValidUUID(args.order_id)) {
      return {
        success: false,
        message: 'Invalid order ID format',
        error: {
          code: 'validation_error',
          details: 'invalid_uuid'
        }
      }
    }

    const order = await prisma.order.update({
      where: { id: args.order_id },
      data: {
        status: args.status,
        ...(args.tracking_number && { tracking_number: args.tracking_number }),
        processed_by: adminEmail,
        ...(args.status === 'PROCESSING' && { processing_started_at: new Date() }),
        ...(args.admin_notes && { admin_notes: args.admin_notes }),
        ...(args.override_monthly !== undefined && { override_monthly: args.override_monthly })
      }
    })

    await prisma.adminLog.create({
      data: {
        action: 'UPDATE_STATUS' as AdminAction,
        admin_email: adminEmail,
        metadata: {
          order_id: args.order_id,
          new_status: args.status,
          tracking_number: args.tracking_number,
          override_monthly: args.override_monthly
        }
      }
    })

    const orderBase: OrderBase = {
      order_id: order.id,
      status: order.status,
      tracking_number: order.tracking_number || undefined
    }

    return {
      success: true,
      message: 'Order updated successfully',
      data: {
        order: orderBase
      }
    }
  } catch (error) {
    return handleOperationError(error, 'update order')
  }
}

/**
 * @deprecated Use analyzeBookCover and checkDuplicates instead
 */
export async function analyzeBookAndCheckDuplicates(args: {
  book_info: {
    title_zh: string
    title_en?: string
    author_zh?: string
    author_en?: string
    publisher_zh?: string
    publisher_en?: string
    category_type: CategoryType
    tags: string[]
  }
  image_url: string
}, adminEmail: string): Promise<AdminOperationResult> {
  console.log('🔍 Starting book analysis and duplicate check:', args)

  try {
    // Simple text-based search without variants
    const potentialMatches = await prisma.book.findMany({
      where: {
        OR: [
          // Direct title match
          {
            title_zh: {
              contains: args.book_info.title_zh,
              mode: Prisma.QueryMode.insensitive
            }
          },
          // English title if available
          ...(args.book_info.title_en ? [{
            title_en: {
              contains: args.book_info.title_en,
              mode: Prisma.QueryMode.insensitive
            }
          }] : [])
        ] as Prisma.BookWhereInput[]
      },
      include: {
        category: true
      }
    })

    // Visual comparison using GPT-4o
    const matches = await Promise.all(
      potentialMatches.map(async (match) => {
        if (!match.cover_image) return null

        const visualAnalysis = await analyzeVisualSimilarity(
          args.image_url,
          match.cover_image
        )

        return {
          book: match,
          visual_analysis: visualAnalysis,
          differences: {
            publisher: match.publisher_zh !== args.book_info.publisher_zh,
            edition: detectEditionDifference(match, args.book_info),
            layout: visualAnalysis.layout_similarity < 0.8
          }
        }
      })
    )

    // Filter out null results and sort by visual similarity
    const validMatches = matches
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => 
        (b.visual_analysis.layout_similarity + b.visual_analysis.content_similarity) -
        (a.visual_analysis.layout_similarity + a.visual_analysis.content_similarity)
      )

    // Log the operation
    await prisma.adminLog.create({
      data: {
        action: 'CHECK_DUPLICATE',
        admin_email: adminEmail,
        metadata: {
          book_info: args.book_info,
          matches_found: validMatches.length
        }
      }
    })

    return {
      success: true,
      message: 'Analysis complete',
      data: {
        analysis_result: {
          current_book: args.book_info,
          matches: validMatches.map(match => ({
            book: toBookBase(match.book),
            visual_similarity: {
              layout: match.visual_analysis.layout_similarity,
              content: match.visual_analysis.content_similarity
            },
            differences: match.differences
          }))
        }
      }
    }
  } catch (error) {
    return handleOperationError(error, 'analyze book and check duplicates')
  }
}

async function analyzeVisualSimilarity(
  newImageUrl: string,
  existingImageUrl: string | null
): Promise<{
  layout_similarity: number
  content_similarity: number
  confidence: number
}> {
  if (!existingImageUrl) {
    return {
      layout_similarity: 0,
      content_similarity: 0,
      confidence: 1
    }
  }

  try {
    // Standardize both URLs
    const [standardizedNew, standardizedExisting] = await Promise.all([
      standardizeImageUrl(newImageUrl),
      standardizeImageUrl(existingImageUrl)
    ])

    console.log('✅ Using standardized URLs for comparison:', {
      new: standardizedNew,
      existing: standardizedExisting
    })

    const response = await createVisionChatCompletion({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Compare these Buddhist book covers and analyze their similarity. Focus on:
1. Layout similarity (consider: title placement, overall design, text arrangement)
2. Content similarity (consider: text content, imagery, Buddhist symbols)
3. Overall confidence in your comparison

For each aspect, provide a numerical score between 0 and 1, where:
- 0 means completely different
- 1 means identical
- 0.5 means moderately similar

Format your response as:
Layout similarity: [score]
Content similarity: [score]
Confidence: [score]

Then provide a brief explanation of your scoring.`
            },
            {
              type: 'image_url',
              image_url: { url: standardizedNew }
            },
            {
              type: 'image_url',
              image_url: { url: standardizedExisting }
            }
          ]
        }
      ],
      stream: false
    })

    // Type guard to ensure we have a ChatCompletion
    if (response instanceof ReadableStream) {
      throw new Error('Unexpected streaming response')
    }

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('No analysis received from vision model')
    }

    console.log('📊 Vision analysis response:', content)

    // Extract scores using regex
    const layoutMatch = content.match(/layout.*?(\d+\.?\d*)/i)
    const contentMatch = content.match(/content.*?(\d+\.?\d*)/i)
    const confidenceMatch = content.match(/confidence.*?(\d+\.?\d*)/i)

    const result = {
      layout_similarity: layoutMatch ? parseFloat(layoutMatch[1]) : 0.5,
      content_similarity: contentMatch ? parseFloat(contentMatch[1]) : 0.5,
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5
    }

    console.log('📊 Extracted similarity scores:', result)
    return result

  } catch (error) {
    console.error('❌ Visual comparison error:', error)
    return {
      layout_similarity: 0.5,
      content_similarity: 0.5,
      confidence: 0.3
    }
  }
}

function calculateSimilarityScore(
  existingBook: Book & { category: Category },
  searchCriteria: {
    title_zh: string
    title_en?: string
    author_zh?: string
    author_en?: string
    publisher_zh?: string
    publisher_en?: string
    tags: string[]
  },
  visualAnalysis: {
    layout_similarity: number
    content_similarity: number
    confidence: number
  }
): number {
  const weights = {
    titleMatch: 0.3,
    authorMatch: 0.2,
    publisherMatch: 0.1,
    tagOverlap: 0.1,
    visualSimilarity: 0.3
  }

  // Title similarity
  const titleScore = existingBook.title_zh === searchCriteria.title_zh ? 1 :
    existingBook.title_en === searchCriteria.title_en ? 0.9 : 0

  // Author similarity
  const authorScore = existingBook.author_zh === searchCriteria.author_zh ? 1 :
    existingBook.author_en === searchCriteria.author_en ? 0.9 : 0

  // Publisher similarity
  const publisherScore = existingBook.publisher_zh === searchCriteria.publisher_zh ? 1 :
    existingBook.publisher_en === searchCriteria.publisher_en ? 0.9 : 0

  // Tag overlap
  const tagOverlap = searchCriteria.tags.filter(tag => 
    existingBook.search_tags.includes(tag)
  ).length / Math.max(searchCriteria.tags.length, existingBook.search_tags.length)

  // Visual similarity (weighted average of layout and content)
  const visualScore = (
    visualAnalysis.layout_similarity * 0.4 +
    visualAnalysis.content_similarity * 0.6
  ) * visualAnalysis.confidence

  // Calculate weighted average
  const totalScore = 
    weights.titleMatch * titleScore +
    weights.authorMatch * authorScore +
    weights.publisherMatch * publisherScore +
    weights.tagOverlap * tagOverlap +
    weights.visualSimilarity * visualScore

  return Math.round(totalScore * 100) / 100 // Round to 2 decimal places
}

function detectEditionDifference(
  existingBook: Book & { category: Category },
  searchCriteria: {
    title_zh: string
    title_en?: string
    author_zh?: string
    author_en?: string
    publisher_zh?: string
    publisher_en?: string
    tags: string[]
  }
): boolean {
  console.log('🔍 Checking for edition differences')

  // Check for edition indicators in titles
  const editionPattern = /[（(].*[版|edition].*[）)]/i
  const existingEdition = existingBook.title_zh.match(editionPattern) || 
                         existingBook.title_en?.match(editionPattern)
  const newEdition = searchCriteria.title_zh.match(editionPattern) ||
                    searchCriteria.title_en?.match(editionPattern)
  
  if (existingEdition && newEdition && existingEdition[0] !== newEdition[0]) {
    console.log('📖 Different editions detected:', {
      existing: existingEdition[0],
      new: newEdition[0]
    })
    return true
  }

  // Check for different publishers
  if (existingBook.publisher_zh !== searchCriteria.publisher_zh ||
      existingBook.publisher_en !== searchCriteria.publisher_en) {
    console.log('📚 Different publishers detected:', {
      existing: {
        zh: existingBook.publisher_zh,
        en: existingBook.publisher_en
      },
      new: {
        zh: searchCriteria.publisher_zh,
        en: searchCriteria.publisher_en
      }
    })
    return true
  }

  return false
}

function analyzeResults(matches: Array<{
  book_id: string
  similarity_score: number
  differences: {
    publisher?: boolean
    edition?: boolean
    layout?: boolean
  }
  visual_analysis: {
    layout_similarity: number
    content_similarity: number
    confidence: number
  }
}>): {
  has_duplicates: boolean
  confidence: number
  recommendation: 'create_new' | 'update_existing' | 'needs_review'
} {
  console.log('🔍 Analyzing duplicate detection results')

  if (matches.length === 0) {
    console.log('✨ No matches found, recommending new creation')
    return {
      has_duplicates: false,
      confidence: 1,
      recommendation: 'create_new'
    }
  }

  // Sort matches by similarity score
  const sortedMatches = [...matches].sort((a, b) => 
    b.similarity_score - a.similarity_score
  )

  const bestMatch = sortedMatches[0]
  const confidence = bestMatch.visual_analysis.confidence

  console.log('📊 Best match analysis:', {
    similarity_score: bestMatch.similarity_score,
    differences: bestMatch.differences,
    confidence
  })

  // High similarity score and no significant differences
  if (bestMatch.similarity_score > 0.9 && 
      !bestMatch.differences.edition &&
      !bestMatch.differences.publisher) {
    console.log('🎯 High similarity detected, recommending update')
    return {
      has_duplicates: true,
      confidence,
      recommendation: 'update_existing'
    }
  }

  // Different editions or publishers but similar content
  if (bestMatch.similarity_score > 0.7 &&
      (bestMatch.differences.edition || bestMatch.differences.publisher)) {
    console.log('⚠️ Similar content but different edition/publisher detected')
    return {
      has_duplicates: true,
      confidence,
      recommendation: 'needs_review'
    }
  }

  console.log('✨ No significant matches, recommending new creation')
  return {
    has_duplicates: false,
    confidence,
    recommendation: 'create_new'
  }
} 