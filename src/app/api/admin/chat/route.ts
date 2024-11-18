import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage, getChatResponse } from '@/lib/openai';
import { uploadAndOptimizeImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { createBookListing } from '@/lib/services/book-service';
import { BookAnalysis } from '@/components/admin/ai-chat/types';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, image, previousMessages, currentBookData } = await request.json();
    console.log('Received request:', { message, currentBookData });

    // Handle image upload
    if (image) {
      try {
        const { displayUrl, originalImageData } = await uploadAndOptimizeImage(image);
        const bookAnalysis = await processBookImage(originalImageData);
        const analysisWithImage = {
          ...bookAnalysis,
          cover_image: displayUrl,
          imageUrl: displayUrl
        };

        return NextResponse.json({ 
          message: [
            `I've analyzed the book cover. Here's what I found:`,
            ``,
            `Title (English): ${bookAnalysis?.title_en || 'Not detected'}`,
            `Title (Chinese): ${bookAnalysis?.title_zh || 'Not detected'}`,
            ``,
            `Description (English):`,
            `${bookAnalysis?.description_en || 'No description available'}`,
            ``,
            `Description (Chinese):`,
            `${bookAnalysis?.description_zh || 'No description available'}`,
            ``,
            `Tags: ${bookAnalysis?.search_tags?.join(', ') || 'None'}`,
            `Categories: ${bookAnalysis?.category_suggestions?.join(', ') || 'None'}`,
            ``,
            `Image has been uploaded to: ${displayUrl}`,
            ``,
            `Would you like me to create a new book listing with this information?`
          ].join('\n'),
          analysis: analysisWithImage,
          imageUrl: displayUrl
        });
      } catch (error) {
        console.error('Error processing image:', error);
        throw error;
      }
    }

    // For all other messages, let the LLM interpret the intent
    const chatResponse = await getChatResponse(message, {
      previousMessages: previousMessages || [],
      bookData: currentBookData,
      adminAction: 'chat'
    });

    // Parse LLM's structured response
    if (chatResponse.action && chatResponse.data) {
      switch (chatResponse.action) {
        case 'UPDATE_TITLE':
          if (chatResponse.data.title) {
            return NextResponse.json({
              message: chatResponse.content || `Title updated to: ${chatResponse.data.title}. Please specify the quantity.`,
              bookData: {
                ...currentBookData,
                title_zh: chatResponse.data.title
              }
            });
          }
          break;

        case 'UPDATE_QUANTITY':
          if (typeof chatResponse.data.quantity === 'number') {
            return NextResponse.json({
              message: chatResponse.content || `Quantity set to ${chatResponse.data.quantity}. Please confirm to create the book listing.`,
              bookData: {
                ...currentBookData,
                quantity: chatResponse.data.quantity
              }
            });
          }
          break;

        case 'CREATE_BOOK':
          // Check if we have all required data
          if (!currentBookData?.quantity) {
            return NextResponse.json({
              message: "Please specify the quantity first. How many copies of this book do you have?",
              bookData: currentBookData
            });
          }

          try {
            const book = await createBookListing(currentBookData);
            return NextResponse.json({
              message: `Book listing created successfully!\nTitle: ${book.title_zh || book.title_en}\nCategory: ${book.category.name_zh}\nQuantity: ${book.quantity}\n\nWould you like to add another book?`,
              reset: true
            });
          } catch (error) {
            return NextResponse.json({
              message: `Failed to create book: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
              error: true
            });
          }
      }
    }

    // Default response
    return NextResponse.json({
      message: chatResponse.content,
      certainty: chatResponse.certainty,
      needs_review: chatResponse.needs_review
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 