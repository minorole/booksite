import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AdminAction } from '@prisma/client';
import { updateBookQuantity, updateBookTitle } from '@/lib/services/book-service';

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

    // Handle quantity update
    if (typeof data.addQuantity === 'number') {
      const result = await updateBookQuantity(params.id, data.addQuantity);
      
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Create audit log using EDIT_BOOK action
      await prisma.adminLog.create({
        data: {
          action: AdminAction.EDIT_BOOK,
          book_id: params.id,
          book_title: result.book.title_zh || result.book.title_en,
          admin_email: session.user.email,
          metadata: {
            action_type: 'update_quantity',
            added_quantity: data.addQuantity,
            new_total: result.book.quantity,
            timestamp: new Date().toISOString()
          }
        }
      });

      return NextResponse.json(result);
    }

    // Handle title update
    if (data.title_en || data.title_zh) {
      const result = await updateBookTitle(params.id, {
        title_en: data.title_en,
        title_zh: data.title_zh
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Create audit log
      await prisma.adminLog.create({
        data: {
          action: AdminAction.EDIT_BOOK,
          book_id: params.id,
          book_title: result.book.title_zh || result.book.title_en,
          admin_email: session.user.email,
          metadata: {
            action_type: 'update_title',
            old_title_en: data.old_title_en,
            old_title_zh: data.old_title_zh,
            new_title_en: data.title_en,
            new_title_zh: data.title_zh,
            timestamp: new Date().toISOString()
          }
        }
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid update operation' }, { status: 400 });

  } catch (error) {
    console.error('Error updating book:', error);
    return NextResponse.json({ 
      error: 'Failed to update book',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 