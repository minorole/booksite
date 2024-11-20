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
    console.log('Updating book with data:', data);

    // Get the book first
    const book = await prisma.book.findUnique({
      where: { id: params.id },
      include: { category: true }
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    // Handle title updates
    if (data.title_en !== undefined) updateData.title_en = data.title_en;
    if (data.title_zh !== undefined) updateData.title_zh = data.title_zh;

    // Handle description updates
    if (data.description_en !== undefined) updateData.description_en = data.description_en;
    if (data.description_zh !== undefined) updateData.description_zh = data.description_zh;

    // Handle quantity update
    if (typeof data.quantity === 'number') {
      updateData.quantity = data.quantity;
    }

    // Handle search tags update
    if (Array.isArray(data.search_tags)) {
      updateData.search_tags = data.search_tags;
    }

    // Handle category update - FIXED
    if (data.category_type) {
      // Find category by type
      const category = await prisma.category.findFirst({
        where: { type: data.category_type }
      });

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 });
      }

      // Update using connect
      updateData.category = {
        connect: { id: category.id }
      };
    }

    console.log('Final update data:', updateData);

    // Perform update
    const updatedBook = await prisma.book.update({
      where: { id: params.id },
      data: updateData,
      include: {
        category: true
      }
    });

    // Create audit log
    await prisma.adminLog.create({
      data: {
        action: AdminAction.EDIT_BOOK,
        book_id: params.id,
        book_title: updatedBook.title_zh || updatedBook.title_en,
        admin_email: session.user.email,
        metadata: {
          action_type: 'update',
          changes: data,
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({ success: true, book: updatedBook });

  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json({ 
      error: 'Failed to update book',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 