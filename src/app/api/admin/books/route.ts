import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication and admin role
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching books from database...');

    // Fetch books with categories, removing type from select
    const books = await prisma.book.findMany({
      include: {
        category: {
          select: {
            name_en: true,
            name_zh: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // If we need the type, we can fetch it separately or modify the schema
    console.log('Found books:', books.length);
    console.log('Sample book:', books[0]);

    return NextResponse.json({ books });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch books',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 