import { prisma } from '@/lib/prisma'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type AdminAction } from '@prisma/client'

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.user_metadata?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    console.log('📝 Updating book:', { id: params.id, ...data })

    const book = await prisma.book.update({
      where: { id: params.id },
      data: {
        ...(data.title_zh !== undefined && { title_zh: data.title_zh }),
        ...(data.title_en !== undefined && { title_en: data.title_en }),
        ...(data.description_zh !== undefined && { description_zh: data.description_zh }),
        ...(data.description_en !== undefined && { description_en: data.description_en }),
        ...(data.category_type && {
          category: {
            connect: { type: data.category_type }
          }
        }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.tags && { search_tags: data.tags })
      }
    })

    // Log the action
    await prisma.adminLog.create({
      data: {
        action: 'EDIT_BOOK' as AdminAction,
        book_id: book.id,
        book_title: book.title_en || book.title_zh,
        admin_email: user.email!,
        metadata: data
      }
    })

    console.log('✅ Book updated successfully:', {
      id: book.id,
      title: book.title_zh || book.title_en,
      changes: data
    })

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
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.user_metadata?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const book = await prisma.book.delete({
      where: { id: params.id }
    })

    // Log the action
    await prisma.adminLog.create({
      data: {
        action: 'DELETE_BOOK' as AdminAction,
        book_id: book.id,
        book_title: book.title_en || book.title_zh,
        admin_email: user.email!,
        metadata: { id: params.id }
      }
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