import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createBookListing } from '@/lib/services/book-service';

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
    
    // Check for duplicates first
    const existingBook = await prisma.book.findFirst({
      where: {
        title_zh: bookData.title_zh
      },
      include: {
        category: true
      }
    });

    if (existingBook) {
      return NextResponse.json({ 
        error: 'Duplicate book found',
        duplicate: existingBook,
        message: `A book with this title already exists:\nTitle: ${existingBook.title_zh}\nQuantity: ${existingBook.quantity}\nCategory: ${existingBook.category?.name_zh}\n\nWould you like to update this book instead?`
      }, { status: 409 }); // 409 Conflict
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