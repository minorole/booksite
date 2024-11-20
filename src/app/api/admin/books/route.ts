import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createBookListing, findPossibleDuplicates } from '@/lib/services/book-service';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication and admin role
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch books with categories
    const books = await prisma.book.findMany({
      include: {
        category: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch books',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookData = await request.json();
    
    // Use the more robust duplicate detection
    const title = bookData.title_zh || bookData.title_en;
    if (title) {
      const { exactMatch, similarMatches } = await findPossibleDuplicates(title);

      if (exactMatch || similarMatches.length > 0) {
        const duplicate = exactMatch || similarMatches[0];
        return NextResponse.json({ 
          error: 'Duplicate book found',
          duplicate: duplicate,
          similarMatches: similarMatches,
          message: [
            `A similar book already exists:`,
            `Title: ${duplicate.title_zh || duplicate.title_en}`,
            `Quantity: ${duplicate.quantity}`,
            `Category: ${duplicate.category?.name_zh}`,
            ``,
            `Would you like to:`,
            `1. Update the existing book`,
            `2. Create a new listing anyway`,
            `3. Cancel the operation`
          ].join('\n')
        }, { status: 409 });
      }
    }

    // Create book listing using the service function
    const book = await createBookListing(bookData);
    return NextResponse.json(book);

  } catch (error) {
    console.error('Error creating book:', error);
    return NextResponse.json({ 
      error: 'Failed to create book listing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 