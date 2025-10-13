import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { listBooks } from '@/lib/db/books'
import { CATEGORY_TYPES, type CategoryType } from '@/lib/db/enums'
import { createBookDb, logAdminAction } from '@/lib/db/admin'

export async function GET() {
  try {
    // Verify admin access
    let user
    try {
      user = await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw e
    }

    const books = await listBooks()

    return NextResponse.json({ books })
  } catch (error) {
    console.error('❌ Failed to fetch books:', error)
    return NextResponse.json(
      { error: 'Failed to fetch books' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verify admin access
    let user
    try {
      user = await assertAdmin()
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      throw e
    }

    const data = await request.json()

    // Validate required fields
    if (!data.title_zh && !data.title_en) {
      return NextResponse.json(
        { error: 'At least one title (Chinese or English) must be provided' },
        { status: 400 }
      )
    }

    // Resolve category by type
    const categoryType = data.category_type as CategoryType | undefined
    if (!categoryType || !CATEGORY_TYPES.includes(categoryType)) {
      return NextResponse.json(
        { error: 'Invalid or missing category_type' },
        { status: 400 }
      )
    }

    // Delegate to db helper to insert and normalize tags
    const created = await createBookDb({
      title_zh: data.title_zh || '',
      title_en: data.title_en ?? null,
      description_zh: data.description_zh || '',
      description_en: data.description_en ?? null,
      category_type: categoryType,
      quantity: typeof data.quantity === 'number' ? data.quantity : 0,
      cover_image: typeof data.cover_image === 'string' ? data.cover_image : '',
      tags: Array.isArray(data.tags)
        ? data.tags.filter(Boolean)
        : (typeof data.tags === 'string'
            ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : []),
    })

    // Admin log via helper
    await logAdminAction({
      action: 'CREATE_BOOK',
      admin_email: user.email!,
      book_id: created.id,
      book_title: data.title_en || data.title_zh || null,
      metadata: data,
    })

    return NextResponse.json({ book: { id: created.id } })
  } catch (error) {
    console.error('❌ Failed to create book:', error)
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    )
  }
} 
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
