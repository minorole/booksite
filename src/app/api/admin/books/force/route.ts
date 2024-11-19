import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AdminAction } from '@prisma/client';
import { forceCreateBookListing } from '@/lib/services/book-service';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookData = await request.json();
    const result = await forceCreateBookListing(bookData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Create audit log
    await prisma.adminLog.create({
      data: {
        action: AdminAction.EDIT_BOOK,
        book_id: result.book.id,
        book_title: result.book.title_zh || result.book.title_en,
        admin_email: session.user.email,
        metadata: {
          action_type: 'force_create',
          duplicate_of: bookData.duplicate_reasons?.[bookData.duplicate_reasons.length - 1],
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in force create:', error);
    return NextResponse.json({ 
      error: 'Failed to create book',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 