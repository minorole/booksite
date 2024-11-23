import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AdminAction } from '@prisma/client';
import type { BookData } from '@/types/admin/chat';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the book
    await prisma.book.delete({
      where: { id: params.id }
    });

    // Log the deletion
    await prisma.adminLog.create({
      data: {
        action: AdminAction.DELETE_BOOK,
        book_id: params.id,
        admin_email: session.user.email!,
        metadata: {
          action_type: 'manual_delete',
          timestamp: new Date().toISOString()
        }
      }
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

    // Get the book first
    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: { category: true }
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      title_en: data.title_en,
      title_zh: data.title_zh,
      description_en: data.description_en,
      description_zh: data.description_zh,
      quantity: data.quantity,
      search_tags: data.search_tags || [],
      discontinued: data.discontinued || false,
      discontinued_reason: data.discontinued_reason,
      discontinued_at: data.discontinued ? new Date() : null,
      discontinued_by: data.discontinued ? session.user.email : null,
      last_quantity_update: new Date()
    };

    // Handle category update
    if (data.category_type) {
      const category = await prisma.category.findFirst({
        where: { type: data.category_type }
      });

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 });
      }

      updateData.category = {
        connect: { id: category.id }
      };
    }

    // Perform update
    const updatedBook = await prisma.book.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: true
      }
    });

    // Log the update
    await prisma.adminLog.create({
      data: {
        action: AdminAction.EDIT_BOOK,
        book_id: params.id,
        book_title: updatedBook.title_zh || updatedBook.title_en,
        admin_email: session.user.email,
        metadata: {
          action_type: 'manual_update',
          changes: data,
          timestamp: new Date().toISOString()
        }
      }
    });

    // Transform to BookData type
    const transformedBook: BookData = {
      ...updatedBook,
      auto_tags: updatedBook.auto_tags || [],
      pending_tags: updatedBook.pending_tags || [],
      rejected_tags: updatedBook.rejected_tags || [],
      ai_metadata: updatedBook.ai_metadata || null,
      image_analysis_data: updatedBook.image_analysis_data || null,
      discontinued_at: updatedBook.discontinued_at || undefined,
      discontinued_by: updatedBook.discontinued_by || undefined,
      discontinued_reason: updatedBook.discontinued_reason || undefined,
      last_quantity_update: updatedBook.last_quantity_update || undefined,
      category: {
        id: updatedBook.category.id,
        type: updatedBook.category.type,
        name_zh: updatedBook.category.name_zh,
        name_en: updatedBook.category.name_en
      }
    };

    return NextResponse.json({ success: true, book: transformedBook });

  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json({ 
      error: 'Failed to update book',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 