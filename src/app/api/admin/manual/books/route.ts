import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { listBooks } from '@/lib/db/books'
import { CATEGORY_TYPES, type CategoryType } from '@/lib/db/enums'
import { createBookDb, logAdminAction } from '@/lib/db/admin'
import { z } from 'zod'

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

    const CreateBookSchema = z.object({
      title_zh: z.string().trim().min(1, 'title_zh required'),
      title_en: z.string().trim().optional(),
      description_zh: z.string().trim().min(1, 'description_zh required'),
      description_en: z.string().trim().optional(),
      category_type: z.enum(CATEGORY_TYPES),
      quantity: z.number().int().min(0),
      cover_image: z.string().url().optional(),
      tags: z.union([z.array(z.string()), z.string()]).optional(),
    })

    const parsed = CreateBookSchema.safeParse(data)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Normalize tags to string[]
    const tagsArray = Array.isArray(parsed.data.tags)
      ? parsed.data.tags.filter(Boolean)
      : (typeof parsed.data.tags === 'string'
          ? parsed.data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [])

    // Delegate to db helper to insert and normalize tags
    const created = await createBookDb({
      title_zh: parsed.data.title_zh,
      title_en: parsed.data.title_en ?? null,
      description_zh: parsed.data.description_zh,
      description_en: parsed.data.description_en ?? null,
      category_type: parsed.data.category_type as CategoryType,
      quantity: parsed.data.quantity,
      cover_image: parsed.data.cover_image ?? null,
      tags: tagsArray,
    })

    // Admin log via helper
    await logAdminAction({
      action: 'CREATE_BOOK',
      admin_email: user.email!,
      book_id: created.id,
      book_title: parsed.data.title_en || parsed.data.title_zh || null,
      metadata: parsed.data,
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
