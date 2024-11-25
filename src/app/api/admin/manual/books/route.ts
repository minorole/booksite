import { prisma } from '@/lib/prisma'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { type AdminAction } from '@prisma/client'

export async function GET() {
  try {
    // Verify admin access
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.user_metadata?.role)) {
      console.log('❌ Unauthorized access attempt:', {
        email: user?.email,
        role: user?.user_metadata?.role,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const books = await prisma.book.findMany({
      include: {
        category: true
      },
      orderBy: {
        updated_at: 'desc'
      }
    })

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
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.user_metadata?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()

    // Validate required fields
    if (!data.title_zh && !data.title_en) {
      return NextResponse.json(
        { error: 'At least one title (Chinese or English) must be provided' },
        { status: 400 }
      )
    }

    const book = await prisma.book.create({
      data: {
        title_zh: data.title_zh || '',
        title_en: data.title_en,
        description_zh: data.description_zh || '',
        description_en: data.description_en,
        category: {
          connect: {
            type: data.category_type
          }
        },
        quantity: data.quantity,
        search_tags: data.tags,
        content_summary_zh: '',
        content_summary_en: null
      }
    })

    // Log the action
    await prisma.adminLog.create({
      data: {
        action: 'CREATE_BOOK' as AdminAction,
        book_id: book.id,
        book_title: data.title_en || data.title_zh,
        admin_email: user.email!,
        metadata: data
      }
    })

    return NextResponse.json({ book })
  } catch (error) {
    console.error('❌ Failed to create book:', error)
    return NextResponse.json(
      { error: 'Failed to create book' },
      { status: 500 }
    )
  }
} 