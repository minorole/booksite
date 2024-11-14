import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage, getChatResponse } from '@/lib/openai';
import { uploadAndOptimizeImage } from '@/lib/cloudinary';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check authentication and admin role
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, image, previousMessages, currentBookData } = await request.json();

    if (image) {
      try {
        // Process image with Cloudinary first
        const { displayUrl, originalImageData } = await uploadAndOptimizeImage(image);

        // Process with OpenAI using the original image data
        const bookAnalysis = await processBookImage(originalImageData);

        // Final response
        const analysisMessage = [
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
          `Tags: ${bookAnalysis?.search_tags?.length ? bookAnalysis.search_tags.join(', ') : 'None'}`,
          `Categories: ${bookAnalysis?.category_suggestions?.length ? bookAnalysis.category_suggestions.join(', ') : 'None'}`,
          ``,
          `Image has been uploaded to: ${displayUrl}`,
          ``,
          `Would you like me to create a new book listing with this information?`
        ].join('\n');

        return NextResponse.json({ 
          message: analysisMessage,
          analysis: bookAnalysis,
          imageUrl: displayUrl
        });
      } catch (error) {
        console.error('Processing error:', error);
        return NextResponse.json({ 
          error: 'Failed to process image',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    // Handle text-based chat
    try {
      const chatResponse = await getChatResponse(message, {
        bookData: currentBookData,
        previousMessages: previousMessages || [],
        adminAction: 'chat'
      });

      // If the message indicates book creation, attempt to create the book
      if (message.toLowerCase() === 'yes create it' && currentBookData) {
        try {
          const bookResponse = await fetch('/api/admin/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...currentBookData,
              cover_image: currentBookData.imageUrl
            })
          });

          const bookResult = await bookResponse.json();
          
          if (bookResult.error) {
            return NextResponse.json({ 
              message: `Failed to create book: ${bookResult.error}. Would you like to try again?`,
              error: bookResult.error 
            });
          }

          return NextResponse.json({ 
            message: 'Book has been successfully created! Would you like to add another book?',
            book: bookResult.book
          });
        } catch (error) {
          return NextResponse.json({ 
            message: 'Failed to create book. Would you like to try again?',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({ 
        message: chatResponse.content,
        certainty: chatResponse.certainty,
        needs_review: chatResponse.needs_review 
      });
    } catch (error) {
      console.error('Chat response error:', error);
      return NextResponse.json({ 
        error: 'Failed to get chat response',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 