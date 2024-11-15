import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage, getChatResponse } from '@/lib/openai';
import { uploadAndOptimizeImage } from '@/lib/cloudinary';
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

    if (image) {
      try {
        // Process image with Cloudinary first
        const { displayUrl, originalImageData } = await uploadAndOptimizeImage(image);

        // Process with OpenAI using the original image data
        const bookAnalysis = await processBookImage(originalImageData);

        // Add the Cloudinary URL to the analysis
        const analysisWithImage = {
          ...bookAnalysis,
          cover_image: displayUrl,
          imageUrl: displayUrl
        };

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
          analysis: analysisWithImage,
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
    if (message) {
      // Handle quantity input
      const quantityMatch = message.match(/^\d+$/);
      if (currentBookData && quantityMatch) {
        console.log('Processing quantity input:', message);
        const quantity = parseInt(message, 10);
        if (isNaN(quantity) || quantity < 0) {
          return NextResponse.json({ 
            message: "Please enter a valid quantity (0 or positive number)."
          });
        }

        const updatedBookData = {
          ...currentBookData,
          quantity
        };
        console.log('Updated book data with quantity:', updatedBookData);

        return NextResponse.json({
          message: `Quantity set to ${quantity}. Would you like to create the book listing now? (Reply 'yes' to confirm)`,
          bookData: updatedBookData
        });
      }

      // Handle confirmation with expanded phrases
      const confirmationPhrases = ['yes', 'confirm', 'sounds good', 'proceed', 'ok', 'sure'];
      const isConfirmation = confirmationPhrases.some(phrase => 
        message.toLowerCase().includes(phrase)
      );

      console.log('Checking confirmation:', { 
        message, 
        isConfirmation, 
        hasBookData: !!currentBookData,
        currentBookData 
      });

      if (currentBookData && isConfirmation) {
        if (!currentBookData.quantity && currentBookData.quantity !== 0) {
          return NextResponse.json({
            message: "Please specify the quantity first. How many copies are available?"
          });
        }

        try {
          console.log('Preparing book data for creation:', currentBookData);
          
          // Make sure we have the cover image
          if (!currentBookData.cover_image && !currentBookData.imageUrl) {
            throw new Error('Cover image is missing');
          }

          // Create book listing with proper cover image
          const bookData = {
            ...currentBookData,
            cover_image: currentBookData.cover_image || currentBookData.imageUrl,
            category_suggestions: currentBookData.category_suggestions || ['OTHER_BOOKS', '其他佛书']
          };

          console.log('Sending data to createBookListing:', JSON.stringify(bookData, null, 2));
          const book = await createBookListing(bookData);
          console.log('Book created successfully:', book);

          return NextResponse.json({ 
            message: 'Book listing created successfully! Would you like to add another book?',
            book,
            reset: true
          });
        } catch (error) {
          console.error('Error creating book:', error);
          return NextResponse.json({ 
            message: `Failed to create book listing: ${error instanceof Error ? error.message : 'Unknown error'}. Would you like to try again?`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Regular chat response
      const chatResponse = await getChatResponse(message, {
        bookData: currentBookData,
        previousMessages: previousMessages || [],
        adminAction: 'chat'
      });

      return NextResponse.json({ 
        message: chatResponse.content,
        certainty: chatResponse.certainty,
        needs_review: chatResponse.needs_review 
      });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 