import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AdminAction } from '@prisma/client';
import type { BookData } from '@/types/admin/chat';

// Transform database book to BookData
const transformToBookData = (book: any): BookData => ({
  id: book.id,
  title_zh: book.title_zh,
  title_en: book.title_en,
  description_zh: book.description_zh,
  description_en: book.description_en,
  cover_image: book.cover_image,
  quantity: book.quantity,
  category: {
    id: book.category.id,
    type: book.category.type,
    name_zh: book.category.name_zh,
    name_en: book.category.name_en
  },
  search_tags: book.search_tags || [],
  auto_tags: book.auto_tags || [],
  pending_tags: book.pending_tags || [],
  rejected_tags: book.rejected_tags || [],
  ai_metadata: book.ai_metadata || null,
  image_analysis_data: book.image_analysis_data || null,
  discontinued: book.discontinued || false,
  discontinued_at: book.discontinued_at || undefined,
  discontinued_by: book.discontinued_by || undefined,
  discontinued_reason: book.discontinued_reason || undefined,
  last_quantity_update: book.last_quantity_update || undefined,
  created_at: book.created_at,
  updated_at: book.updated_at
});

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

    // Transform to BookData type
    const transformedBooks = books.map(transformToBookData);

    return NextResponse.json({ books: transformedBooks });
  } catch (error) {
    console.error('Error fetching books:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch books',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 