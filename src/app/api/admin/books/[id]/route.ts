import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AdminAction } from '@prisma/client';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication and admin role
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the book
    await prisma.book.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting book:', error);
    return NextResponse.json({ 
      error: 'Failed to delete book',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Update book with audit metadata
    const updatedBook = await prisma.book.update({
      where: { id: params.id },
      data: {
        title_en: data.title_en,
        title_zh: data.title_zh,
        description_en: data.description_en,
        description_zh: data.description_zh,
        quantity: data.quantity,
        search_tags: data.search_tags,
        category: {
          update: {
            type: data.category.type,
            name_en: data.category.name_en,
            name_zh: data.category.name_zh,
          }
        },
        ai_metadata: {
          ...(data.ai_metadata || {}),
          last_edited_by: session.user.email,
          last_edited_at: new Date().toISOString(),
        }
      },
      include: {
        category: true
      }
    });

    // Create audit log with type-safe email
    await prisma.adminLog.create({
      data: {
        action: AdminAction.EDIT_BOOK,
        book_id: params.id,
        book_title: `${data.title_en} / ${data.title_zh}`,
        admin_email: session.user.email,
        metadata: {
          changes: data,
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json(updatedBook);
  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json({ 
      error: 'Failed to update book',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 