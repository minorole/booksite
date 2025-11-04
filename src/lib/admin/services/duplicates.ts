import { checkDuplicatesDb, logAdminAction } from '@/lib/db/admin';
import { searchBooksByTextEmbedding, getBooksByIds } from '@/lib/db/admin/embeddings';
import { createImageEmbeddingClip } from '@/lib/admin/services/image-embeddings/openclip';
import { searchBooksByImageEmbeddingClip } from '@/lib/db/admin/image-embeddings';
import { buildQueryTextForEmbedding } from './embeddings';
import { createTextEmbedding } from '@/lib/openai/embeddings';
import { analyzeVisualSimilarity } from '@/lib/admin/services/vision';
import { handleOperationError } from './utils';
import { type AdminOperationResult } from '@/lib/admin/types';

export async function checkDuplicates(
  args: {
    // Book fields (optional)
    title_zh?: string | null;
    title_en?: string | null;
    author_zh?: string | null;
    author_en?: string | null;
    publisher_zh?: string | null;
    publisher_en?: string | null;
    // Item fields (optional)
    item_name_zh?: string | null;
    item_name_en?: string | null;
    item_type_zh?: string | null;
    item_type_en?: string | null;
    tags?: string[] | null;
    category_type?: import('@/lib/db/enums').CategoryType | null;
    // Visual
    cover_image?: string | null;
  },
  adminEmail: string,
): Promise<AdminOperationResult> {
  try {
    // 0) Exact-image hash match gate (fast path): if the new cover_image URL contains a 40-hex sha1
    // that matches any existing book cover URL, flag as high-confidence duplicate immediately.
    if (args.cover_image && typeof args.cover_image === 'string') {
      const hashMatch = extractSha1FromUrl(args.cover_image);
      if (hashMatch) {
        try {
          const db = await (await import('@/lib/db/client')).getServerDb();
          const { data: rows } = await db
            .from('books')
            .select('id, cover_image')
            .ilike('cover_image', `%/${hashMatch}.%`)
            .limit(5);
          if (Array.isArray(rows) && rows.length > 0) {
            const matches = rows.map((r) => ({
              book_id: String((r as any).id || ''),
              similarity_score: 1,
              differences: {},
              visual_analysis: { layout_similarity: 1, content_similarity: 1, confidence: 1 },
            }));
            await logAdminAction({
              action: 'CHECK_DUPLICATE',
              admin_email: adminEmail,
              metadata: { fast_path: 'hash_match', matches: matches.length },
            });
            return {
              success: true,
              message: 'Exact image match found',
              data: {
                duplicate_detection: {
                  matches,
                  analysis: {
                    has_duplicates: true,
                    confidence: 1,
                    recommendation: 'update_existing',
                  },
                },
                search: { found: true, books: [] },
              },
            };
          }
        } catch {}
      }
    }

    // Determine search keys: prefer explicit book titles; if absent, map item name to title fields
    const titleZh = args.title_zh ?? args.item_name_zh ?? undefined;
    const titleEn = args.title_en ?? args.item_name_en ?? undefined;

    // If no textual fields provided, return early with empty results to avoid broad scans
    const hasText = Boolean(titleZh || titleEn || args.author_zh || args.author_en);
    let potentialMatches: Awaited<ReturnType<typeof checkDuplicatesDb>> = [];
    let fusedRanking: Array<{ id: string; score: number }> = [];
    let textKnn: Array<{ book_id: string; distance: number }> = [];
    let imageKnn: Array<{ book_id: string; distance: number }> = [];
    if (hasText) {
      // Try vector KNN first; fallback to ILIKE search if unavailable or no results
      try {
        const queryText = buildQueryTextForEmbedding({
          title_zh: titleZh,
          title_en: titleEn,
          author_zh: args.author_zh,
          author_en: args.author_en,
          publisher_zh: args.publisher_zh,
          publisher_en: args.publisher_en,
          tags: args.tags ?? null,
        });
        const embedding = await createTextEmbedding(queryText);
        textKnn = await searchBooksByTextEmbedding({
          embedding,
          limit: 20,
          category_type: args.category_type ?? null,
        });

        // Always compute image KNN when a cover image is provided; fail fast on error
        if (args.cover_image) {
          const ivec = await createImageEmbeddingClip(args.cover_image);
          imageKnn = await searchBooksByImageEmbeddingClip({
            embedding: ivec,
            limit: 20,
            category_type: args.category_type ?? null,
          });
        }

        const textScores = new Map<string, number>();
        for (const r of textKnn) textScores.set(r.book_id, 1 - r.distance);
        const imageScores = new Map<string, number>();
        for (const r of imageKnn) imageScores.set(r.book_id, 1 - r.distance);
        const fused = new Map<string, number>();
        const ids = new Set<string>([...textScores.keys(), ...imageScores.keys()]);
        for (const id of ids) {
          const ts = textScores.get(id) ?? 0;
          const is = imageScores.get(id) ?? 0;
          const score = 0.6 * ts + 0.4 * is;
          fused.set(id, score);
        }
        fusedRanking = Array.from(fused.entries())
          .map(([id, score]) => ({ id, score }))
          .sort((a, b) => b.score - a.score);

        const orderedIds = fusedRanking.map((x) => x.id);
        potentialMatches = orderedIds.length > 0 ? await getBooksByIds(orderedIds) : [];
        // Keep potentialMatches ordered by fused ranking
        if (potentialMatches.length > 0) {
          const order = new Map(orderedIds.map((id, i) => [id, i]));
          potentialMatches.sort((a, b) => (order.get(a.id!) ?? 0) - (order.get(b.id!) ?? 0));
        }
      } catch {
        // Fallback: ILIKE search
        potentialMatches = await checkDuplicatesDb({
          title_zh: titleZh ?? null,
          title_en: titleEn ?? null,
          author_zh: args.author_zh ?? null,
          author_en: args.author_en ?? null,
          publisher_zh: args.publisher_zh ?? null,
          publisher_en: args.publisher_en ?? null,
          category_type: args.category_type ?? null,
          tags: args.tags ?? null,
        });
      }
    }

    let visualAnalysis: Array<{
      book: (typeof potentialMatches)[0];
      similarity: { layout: number; content: number; confidence: number };
      differences: { publisher?: boolean; edition?: boolean; layout?: boolean };
    }> = [];

    if (args.cover_image && potentialMatches.length > 0) {
      // Build selected top-3: 1 from image KNN (best), 2 from text KNN (best excluding imageTop)
      // Recompute text/image score maps (from earlier) for id selection
      const bestImageId = imageKnn.length > 0 ? imageKnn[0].book_id : undefined;
      // text top-2 excluding image top
      const textTopIds = (() => {
        // Pick top-2 from textKnn excluding imageTop
        const out: string[] = [];
        for (const r of textKnn) {
          if (r.book_id === bestImageId) continue;
          out.push(r.book_id);
          if (out.length >= 2) break;
        }
        return out;
      })();
      const selectedIds = [bestImageId, ...textTopIds].filter((x): x is string => !!x);
      // Confidence gate: if best fused score is low, skip visual compare
      const bestFused = fusedRanking.length > 0 ? fusedRanking[0].score : 0;
      if (bestFused >= 0.6) {
        const pickById = new Map(potentialMatches.map((b) => [b.id!, b]));
        const subset = selectedIds
          .map((id) => pickById.get(id))
          .filter((b): b is NonNullable<typeof b> => !!b);
        visualAnalysis = await Promise.all(
          subset.map(async (match) => {
            if (!match.cover_image) return null;
            const analysis = await analyzeVisualSimilarity(args.cover_image!, match.cover_image);
            return {
              book: match,
              similarity: {
                layout: analysis.layout_similarity,
                content: analysis.content_similarity,
                confidence: analysis.confidence,
              },
              differences: {
                publisher: undefined,
                edition: false,
                layout: analysis.layout_similarity < 0.8,
              },
            };
          }),
        ).then((r) => r.filter((x): x is NonNullable<typeof x> => x !== null));
      }
    }

    await logAdminAction({
      action: 'CHECK_DUPLICATE',
      admin_email: adminEmail,
      metadata: {
        search_criteria: {
          title_zh: titleZh,
          title_en: titleEn,
          author_zh: args.author_zh,
          author_en: args.author_en,
          publisher_zh: args.publisher_zh,
          publisher_en: args.publisher_en,
          item_type_zh: args.item_type_zh,
          item_type_en: args.item_type_en,
          tags: args.tags,
          category_type: args.category_type,
          has_cover_image: Boolean(args.cover_image),
        },
        text_matches: potentialMatches.length,
        visual_matches: visualAnalysis.length,
        has_visual_comparison: !!args.cover_image,
      },
    });

    const analysis = analyzeResults(
      visualAnalysis.length > 0 ? visualAnalysis.map(toDuplicateMatch) : [],
    );

    return {
      success: true,
      message: 'Duplicate check complete',
      data: {
        duplicate_detection: {
          matches: visualAnalysis.length > 0 ? visualAnalysis.map(toDuplicateMatch) : [],
          analysis,
        },
        search: { found: potentialMatches.length > 0, books: potentialMatches },
      },
    };
  } catch (error) {
    return handleOperationError(error, 'check duplicates');
  }
}

function extractSha1FromUrl(url: string): string | null {
  try {
    const m = url.match(/\/([a-f0-9]{40})\.(?:jpe?g|png|webp|avif|heic|heif)(?:\?|$)/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function analyzeResults(
  matches: Array<{
    book_id: string;
    similarity_score: number;
    differences: { publisher?: boolean; edition?: boolean; layout?: boolean };
    visual_analysis: { layout_similarity: number; content_similarity: number; confidence: number };
  }>,
): {
  has_duplicates: boolean;
  confidence: number;
  recommendation: 'create_new' | 'update_existing' | 'needs_review';
} {
  if (matches.length === 0) {
    return { has_duplicates: false, confidence: 1, recommendation: 'create_new' };
  }

  const sorted = [...matches].sort((a, b) => b.similarity_score - a.similarity_score);
  const best = sorted[0];
  const confidence = best.visual_analysis.confidence;

  if (best.similarity_score > 0.9 && !best.differences.edition && !best.differences.publisher) {
    return { has_duplicates: true, confidence, recommendation: 'update_existing' };
  }

  if (best.similarity_score > 0.7 && (best.differences.edition || best.differences.publisher)) {
    return { has_duplicates: true, confidence, recommendation: 'needs_review' };
  }

  return { has_duplicates: false, confidence, recommendation: 'create_new' };
}

function toDuplicateMatch(v: {
  book: { id?: unknown };
  similarity: { layout: number; content: number; confidence: number };
  differences: { publisher?: boolean; edition?: boolean; layout?: boolean };
}): {
  book_id: string;
  similarity_score: number;
  differences: { publisher?: boolean; edition?: boolean; layout?: boolean };
  visual_analysis: { layout_similarity: number; content_similarity: number; confidence: number };
} {
  const avg = (v.similarity.layout + v.similarity.content) / 2;
  return {
    book_id: String(v.book.id ?? ''),
    similarity_score: avg,
    differences: v.differences,
    visual_analysis: {
      layout_similarity: v.similarity.layout,
      content_similarity: v.similarity.content,
      confidence: v.similarity.confidence,
    },
  };
}
