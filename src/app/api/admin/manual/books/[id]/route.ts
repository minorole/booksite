import { NextResponse } from 'next/server'
import { assertAdmin, UnauthorizedError } from '@/lib/security/guards'
import { getBook } from '@/lib/db/books'
import { CATEGORY_TYPES, type CategoryType } from '@/lib/db/enums'
import { updateBookDb, logAdminAction } from '@/lib/db/admin'
import { promoteTempAsset } from '@/lib/admin/cloudinary'

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
    const { id } = await context.params
    try {
      const keys = Object.keys(data || {})
      console.log('[admin] update_book', { id, keys, tagsCount: Array.isArray((data as any)?.tags) ? (data as any).tags.length : undefined })
    } catch {}

    // Validate category type when provided
    if (data.category_type) {
      const ct = data.category_type as CategoryType
      if (!CATEGORY_TYPES.includes(ct)) {
        return NextResponse.json({ error: 'Invalid category_type' }, { status: 400 })
      }
    }

    // If cover_image provided and points to Cloudinary temp, promote to permanent first
    if (typeof data.cover_image === 'string' && data.cover_image.includes('res.cloudinary.com')) {
      try {
        const promoted = await promoteTempAsset(data.cover_image)
        data.cover_image = promoted.url
      } catch (e) {
        console.warn('cover promotion (update) skipped:', (e as any)?.message || e)
      }
    }

    // Delegate to db helper to perform update and tag replacement
    await updateBookDb(id, {
      title_zh: data.title_zh,
      title_en: data.title_en,
      description_zh: data.description_zh,
      description_en: data.description_en,
      quantity: data.quantity,
      category_type: data.category_type,
      tags: Array.isArray(data.tags)
        ? data.tags.filter(Boolean)
        : (typeof data.tags === 'string'
            ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
            : undefined),
    })

    // Log the action via helper
    await logAdminAction({
      action: 'EDIT_BOOK',
      admin_email: user.email!,
      book_id: id,
      book_title: null,
      metadata: data,
    })

    const book = await getBook(id)
    return NextResponse.json({ book })
  } catch (error) {
    console.error('❌ Failed to update book:', error)
    return NextResponse.json(
      { error: 'Failed to update book' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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

    // Delete and log via helper + thin supabase call
    const { id } = await context.params
    const existing = await getBook(id)
    const dbmod = await (await import('@/lib/db/client')).getServerDb()
    const { error: delErr } = await dbmod
      .from('books')
      .delete()
      .eq('id', id)
    if (delErr) {
      return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 })
    }

    await logAdminAction({
      action: 'DELETE_BOOK',
      admin_email: user.email!,
      book_id: id,
      book_title: existing?.title_en || existing?.title_zh || null,
      metadata: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Failed to delete book:', error)
    return NextResponse.json(
      { error: 'Failed to delete book' },
      { status: 500 }
    )
  }
} 
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const revalidate = 0
