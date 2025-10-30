import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// No dynamic path resolution needed; duplicates.ts imports vision via alias now.

// Mocks for DB and embedding/search helpers
vi.mock('@/lib/db/admin', () => ({
  checkDuplicatesDb: vi.fn(async () => []),
  logAdminAction: vi.fn(async () => undefined),
}))

vi.mock('@/lib/db/admin/embeddings', () => ({
  searchBooksByTextEmbedding: vi.fn(),
  getBooksByIds: vi.fn(),
}))

vi.mock('@/lib/db/admin/image-embeddings', () => ({
  searchBooksByImageEmbeddingClip: vi.fn(),
}))

vi.mock('@/lib/admin/services/image-embeddings/openclip', () => ({
  createImageEmbeddingClip: vi.fn(async () => Array(512).fill(0.01)),
}))

vi.mock('@/lib/openai/embeddings', () => ({
  createTextEmbedding: vi.fn(async () => Array(1536).fill(0.01)),
}))

// Mock the vision similarity function
vi.mock('@/lib/admin/services/vision', () => ({
  analyzeVisualSimilarity: vi.fn(async () => ({
    layout_similarity: 0.9,
    content_similarity: 0.85,
    confidence: 0.8,
  })),
}))

// Import after mocks are declared
import { checkDuplicates } from '@/lib/admin/services/duplicates'

// Convenient handles to typed mocks
const textEmbed = vi.mocked(await import('@/lib/openai/embeddings'))
const textKnnMod = vi.mocked(await import('@/lib/db/admin/embeddings'))
const imgKnnMod = vi.mocked(await import('@/lib/db/admin/image-embeddings'))
const imgEmbed = vi.mocked(await import('@/lib/admin/services/image-embeddings/openclip'))
const vision = vi.mocked(await import('@/lib/admin/services/vision'))

describe('duplicate policy — fused top-3 with confidence gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('selects [1 image-top + 2 text-top] and runs visual comparison when best fused >= 0.6', async () => {
    // Text KNN: b2 (0.9), b1 (0.8)
    textKnnMod.searchBooksByTextEmbedding.mockResolvedValueOnce([
      { book_id: 'b2', distance: 0.1 },
      { book_id: 'b1', distance: 0.2 },
    ])
    // Image KNN: image-top is b3 (0.95), also include b2 with low image score (0.15)
    imgKnnMod.searchBooksByImageEmbeddingClip.mockResolvedValueOnce([
      { book_id: 'b3', distance: 0.05 },
      { book_id: 'b2', distance: 0.85 },
    ])
    // getBooksByIds returns books with cover images for selected ids (order by fused ranking: b2,b1,b3)
    textKnnMod.getBooksByIds.mockResolvedValueOnce([
      { id: 'b2', cover_image: 'https://img/b2.jpg', title_zh: 'b2' },
      { id: 'b1', cover_image: 'https://img/b1.jpg', title_zh: 'b1' },
      { id: 'b3', cover_image: 'https://img/b3.jpg', title_zh: 'b3' },
    ] as any)

    const res = await checkDuplicates(
      {
        title_zh: '书籍',
        author_zh: '作者',
        cover_image: 'https://img/new.jpg',
      },
      'tester@example.com'
    )

    expect(res.success).toBe(true)
    const data = res.data as any
    expect(data).toBeTruthy()
    // Visual comparison should run for 3 selected candidates in order: [imageTop=b3, textTop=b2, text2=b1]
    expect(vision.analyzeVisualSimilarity).toHaveBeenCalledTimes(3)
    const matches = data.duplicate_detection.matches
    expect(Array.isArray(matches)).toBe(true)
    expect(matches).toHaveLength(3)
    expect(matches[0].book_id).toBe('b3')
    expect(matches[1].book_id).toBe('b2')
    expect(matches[2].book_id).toBe('b1')
  })

  it('skips visual comparison when best fused < 0.6 and still returns search list', async () => {
    // Text KNN: low text score
    textKnnMod.searchBooksByTextEmbedding.mockResolvedValueOnce([
      { book_id: 'b1', distance: 0.8 }, // score 0.2
    ])
    // Image KNN: b2 image score 0.6 (distance 0.4)
    imgKnnMod.searchBooksByImageEmbeddingClip.mockResolvedValueOnce([
      { book_id: 'b2', distance: 0.4 },
    ])
    // getBooksByIds for fused order => ['b2','b1'] (0.24 vs 0.12)
    textKnnMod.getBooksByIds.mockResolvedValueOnce([
      { id: 'b2', cover_image: 'https://img/b2.jpg', title_zh: 'b2' },
      { id: 'b1', cover_image: 'https://img/b1.jpg', title_zh: 'b1' },
    ] as any)

    const res = await checkDuplicates(
      {
        title_zh: '书籍',
        author_zh: '作者',
        cover_image: 'https://img/new.jpg',
      },
      'tester@example.com'
    )

    expect(res.success).toBe(true)
    const data = res.data as any
    expect(vision.analyzeVisualSimilarity).not.toHaveBeenCalled()
    // Matches empty when visual compare skipped; search list still populated
    expect(data.duplicate_detection.matches).toHaveLength(0)
    expect(data.search.found).toBe(true)
    expect(data.search.books).toHaveLength(2)
    expect(imgEmbed.createImageEmbeddingClip).toHaveBeenCalledTimes(1)
  })
})
