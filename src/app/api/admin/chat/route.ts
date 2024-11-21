import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage } from '@/lib/ai/image-analysis';
import { getChatResponse } from '@/lib/ai/chat';
import { uploadAndOptimizeImage } from '@/lib/cloudinary';
import { findPossibleDuplicates, analyzeDuplicateWithImages } from '@/lib/services/book-service';
import { BookCreationState } from '@/lib/state/book-creation-state';
import { CommandFactory } from '@/lib/commands/command-factory';
import { ChatAPIAction } from '@/lib/ai/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { message, image, previousMessages, currentBookData } = body;

    // Initialize state
    const state = new BookCreationState(currentBookData);

    // Handle image upload
    if (image) {
      try {
        console.log('Processing image upload...');
        const { displayUrl } = await uploadAndOptimizeImage(image);
        console.log('Image uploaded to:', displayUrl);
        
        const bookAnalysis = await processBookImage(displayUrl);
        console.log('Book analysis result:', bookAnalysis);

        // Check for duplicates if we have a title
        const title = bookAnalysis.title_zh || bookAnalysis.title_en;
        if (title) {
          const { exactMatch, similarMatches } = await findPossibleDuplicates(title);

          if (exactMatch || similarMatches.length > 0) {
            const duplicate = exactMatch || similarMatches[0];
            
            // Add image analysis for potential duplicates
            const imageAnalysis = await analyzeDuplicateWithImages(
              displayUrl,
              duplicate,
              duplicate.title_zh || duplicate.title_en
            );

            // Combine text and image analysis
            const combinedAnalysis = {
              ...bookAnalysis,
              cover_image: displayUrl,
              imageUrl: displayUrl,
              possible_duplicate: true,
              id: duplicate.id,
              duplicate: {
                book: duplicate,
                confidence: exactMatch ? 1 : similarMatches[0].similarity_score,
                image_confidence: imageAnalysis.confidence,
                reasons: [
                  ...(exactMatch ? ['Exact title match'] : ['Similar title found']),
                  ...imageAnalysis.reasons
                ],
                image_analysis: imageAnalysis.analysis,
                alternatives: similarMatches
              }
            };

            return NextResponse.json({
              message: [
                `I found a similar book in our database and analyzed both covers:`,
                ``,
                `Title: ${duplicate.title_zh || duplicate.title_en}`,
                `Current Quantity: ${duplicate.quantity}`,
                `Category: ${duplicate.category?.name_zh}`,
                ``,
                `Image Analysis:`,
                imageAnalysis.analysis,
                ``,
                `Would you like to:`,
                `1. Update the existing book`,
                `2. Create a new listing anyway`,
                `3. Cancel the operation`
              ].join('\n'),
              analysis: combinedAnalysis,
              images: {
                existing: duplicate.cover_image,
                new: displayUrl
              }
            });
          }
        }

        const analysisWithImage = {
          ...bookAnalysis,
          cover_image: displayUrl,
          imageUrl: displayUrl
        };

        // Update state with analysis results
        state.updateState(analysisWithImage);

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

    // Handle text message with streaming
    if (message) {
      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      
      // Start processing in the background
      getChatResponse(
        message,
        {
          previousMessages: previousMessages || [],
          bookData: currentBookData,
          adminAction: 'chat'
        },
        async (chunk) => {
          // Write each chunk to the stream
          await writer.write(encoder.encode(chunk));
        }
      ).then(async (finalResponse) => {
        // When complete, write the final structured response
        await writer.write(
          encoder.encode(
            `\n__END_RESPONSE__${JSON.stringify(finalResponse)}`
          )
        );
        await writer.close();
      }).catch(async (error) => {
        console.error('Streaming error:', error);
        await writer.write(
          encoder.encode(
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        );
        await writer.close();
      });

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return NextResponse.json({ 
      error: 'Invalid request - must provide either message or image' 
    }, { status: 400 });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 