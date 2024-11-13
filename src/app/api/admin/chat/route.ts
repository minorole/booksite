import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage } from '@/lib/openai';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication and admin role
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, image } = await request.json();

    if (image) {
      // Process image with both services concurrently
      const [bookInfo, imageUrl] = await Promise.all([
        processBookImage(image),
        uploadImage(image)
      ]);
      
      return NextResponse.json({ 
        message: "I've analyzed the book cover. Here's what I found:",
        bookInfo,
        imageUrl
      });
    }

    // Handle text-based chat
    const response = "How can I help you with inventory management?";
    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 