import { checkDuplicatesDb, logAdminAction } from '@/lib/db/admin'
import { analyzeVisualSimilarity } from './vision'
import { handleOperationError } from './utils'
import { type AdminOperationResult } from '@/lib/admin/types'

export async function checkDuplicates(
  args: {
    title_zh: string
    title_en?: string
    author_zh?: string
    author_en?: string
    publisher_zh?: string
    publisher_en?: string
    cover_image?: string
  },
  adminEmail: string
): Promise<AdminOperationResult> {
  try {
    const potentialMatches = await checkDuplicatesDb({
      title_zh: args.title_zh,
      title_en: args.title_en,
      author_zh: args.author_zh,
      author_en: args.author_en,
      publisher_zh: args.publisher_zh,
      publisher_en: args.publisher_en,
    })

    let visualAnalysis: Array<{
      book: typeof potentialMatches[0]
      similarity: { layout: number; content: number; confidence: number }
      differences: { publisher?: boolean; edition?: boolean; layout?: boolean }
    }> = []

    if (args.cover_image && potentialMatches.length > 0) {
      visualAnalysis = await Promise.all(
        potentialMatches.map(async (match) => {
          if (!match.cover_image) return null
          const analysis = await analyzeVisualSimilarity(args.cover_image!, match.cover_image)
          return {
            book: match,
            similarity: {
              layout: analysis.layout_similarity,
              content: analysis.content_similarity,
              confidence: analysis.confidence,
            },
            differences: { publisher: undefined, edition: false, layout: analysis.layout_similarity < 0.8 },
          }
        })
      ).then((r) => r.filter((x): x is NonNullable<typeof x> => x !== null))
    }

    await logAdminAction({
      action: 'CHECK_DUPLICATE',
      admin_email: adminEmail,
      metadata: {
        search_criteria: args,
        text_matches: potentialMatches.length,
        visual_matches: visualAnalysis.length,
        has_visual_comparison: !!args.cover_image,
      },
    })

    const analysis = analyzeResults(
      visualAnalysis.length > 0
        ? visualAnalysis.map((v) => ({
            book_id: v.book.id as string,
            similarity_score: (v.similarity.layout + v.similarity.content) / 2,
            differences: v.differences,
            visual_analysis: {
              layout_similarity: v.similarity.layout,
              content_similarity: v.similarity.content,
              confidence: v.similarity.confidence,
            },
          }))
        : []
    )

    return {
      success: true,
      message: 'Duplicate check complete',
      data: {
        duplicate_detection: {
          matches:
            visualAnalysis.length > 0
              ? visualAnalysis.map((v) => ({
                  book_id: v.book.id as string,
                  similarity_score: (v.similarity.layout + v.similarity.content) / 2,
                  differences: v.differences,
                  visual_analysis: {
                    layout_similarity: v.similarity.layout,
                    content_similarity: v.similarity.content,
                    confidence: v.similarity.confidence,
                  },
                }))
              : [],
          analysis,
        },
        search: { found: potentialMatches.length > 0, books: potentialMatches },
      },
    }
  } catch (error) {
    return handleOperationError(error, 'check duplicates')
  }
}

function analyzeResults(
  matches: Array<{
    book_id: string
    similarity_score: number
    differences: { publisher?: boolean; edition?: boolean; layout?: boolean }
    visual_analysis: { layout_similarity: number; content_similarity: number; confidence: number }
  }>
): { has_duplicates: boolean; confidence: number; recommendation: 'create_new' | 'update_existing' | 'needs_review' } {
  if (matches.length === 0) {
    return { has_duplicates: false, confidence: 1, recommendation: 'create_new' }
  }

  const sorted = [...matches].sort((a, b) => b.similarity_score - a.similarity_score)
  const best = sorted[0]
  const confidence = best.visual_analysis.confidence

  if (best.similarity_score > 0.9 && !best.differences.edition && !best.differences.publisher) {
    return { has_duplicates: true, confidence, recommendation: 'update_existing' }
  }

  if (best.similarity_score > 0.7 && (best.differences.edition || best.differences.publisher)) {
    return { has_duplicates: true, confidence, recommendation: 'needs_review' }
  }

  return { has_duplicates: false, confidence, recommendation: 'create_new' }
}
