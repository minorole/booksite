import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage } from '@/lib/ai/image-analysis';
import { getChatResponse } from '@/lib/ai/chat';
import { uploadAndOptimizeImage } from '@/lib/cloudinary';
import { findPossibleDuplicates } from '@/lib/services/book-service';
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
            return NextResponse.json({
              message: [
                `I found a similar book in our database:`,
                ``,
                `Title: ${duplicate.title_zh || duplicate.title_en}`,
                `Current Quantity: ${duplicate.quantity}`,
                `Category: ${duplicate.category?.name_zh}`,
                `Description: ${duplicate.description_zh || duplicate.description_en}`,
                ``,
                `Would you like to:`,
                `1. Update the existing book`,
                `2. Create a new listing anyway`,
                `3. Cancel the operation`,
                ``,
                `If updating, just tell me what you want to change.`
              ].join('\n'),
              analysis: {
                ...bookAnalysis,
                cover_image: displayUrl,
                imageUrl: displayUrl,
                possible_duplicate: true,
                id: duplicate.id,
                duplicate: {
                  book: duplicate,
                  confidence: exactMatch ? 1 : similarMatches[0].similarity_score,
                  reasons: [exactMatch ? 'Exact title match' : 'Similar title found'],
                  alternatives: similarMatches
                }
              },
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

    // Handle text message
    if (message) {
      console.log('Getting chat response for message:', message);
      const chatResponse = await getChatResponse(message, {
        previousMessages: previousMessages || [],
        bookData: currentBookData,
        adminAction: 'chat'
      });

      // Execute command if action exists
      if (chatResponse.action && chatResponse.data) {
        try {
          const command = CommandFactory.createCommand(
            chatResponse.action as ChatAPIAction, 
            state
          );
          const updatedState = await command.execute(chatResponse.data);

          return NextResponse.json({
            message: chatResponse.content,
            action: chatResponse.action,
            data: {
              ...chatResponse.data,
              updatedBook: updatedState
            }
          });
        } catch (error) {
          console.error('Command execution error:', error);
          return NextResponse.json({ 
            error: 'Failed to execute command',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 500 });
        }
      }

      // Return default response
      return NextResponse.json(chatResponse);
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