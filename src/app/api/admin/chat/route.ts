import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage, getChatResponse, formatExtractedText } from '@/lib/openai';
import { uploadAndOptimizeImage } from '@/lib/cloudinary';
import { findPossibleDuplicates, analyzeDuplicateWithImages } from '@/lib/services/book-service';
import { BookCreationState, StateUpdates } from '@/lib/state/book-creation-state';
import { CommandFactory } from '@/lib/commands/command-factory';
import { 
  AssistantResponse, 
  ChatAPIAction, 
  ChatResponseData, 
  ChatMessage,
  BookState 
} from '@/lib/ai/types';
import { PrismaClient, CategoryType } from '@prisma/client';
import { UpdateBookCommand } from '@/lib/commands/update-book';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body with typed previousMessages
    const body = await request.json();
    const { 
      message, 
      image, 
      previousMessages,
      currentBookData 
    }: {
      message?: string;
      image?: string;
      previousMessages?: ChatMessage[];
      currentBookData?: Partial<BookState>;
    } = body;

    // Find the most recent state data from messages or currentBookData
    const lastMessageWithBookData = previousMessages
      ?.slice()  // Create a copy before reverse
      .reverse()
      .find((msg: ChatMessage) => msg.bookData || msg.imageUrl);

    // Combine state data, prioritizing most recent
    const initialState = {
      ...lastMessageWithBookData?.bookData,
      ...currentBookData,
      cover_image: currentBookData?.cover_image || 
                  lastMessageWithBookData?.bookData?.cover_image ||
                  lastMessageWithBookData?.imageUrl
    };

    console.log('Initializing state with:', initialState);
    const state = new BookCreationState(initialState);

    // Handle image upload
    if (image) {
      try {
        console.log('Processing image upload...');
        const { displayUrl } = await uploadAndOptimizeImage(image);
        console.log('Image uploaded to:', displayUrl);
        
        const bookAnalysis = await processBookImage(displayUrl);
        console.log('Book analysis result:', bookAnalysis);

        // Update state with analysis results AND cover image
        const updatedState = {
          ...bookAnalysis,
          cover_image: displayUrl
        };
        
        state.updateState(updatedState);
        console.log('Updated state after image analysis:', state.getState());

        // Check for duplicates if we have a title
        const title = bookAnalysis.title_zh || bookAnalysis.title_en;
        if (title) {
          const { exactMatch, similarMatches } = await findPossibleDuplicates(title);

          if (exactMatch || similarMatches.length > 0) {
            const duplicate = exactMatch || similarMatches[0];
            
            // Add image analysis for potential duplicates
            const duplicateAnalysis = await analyzeDuplicateWithImages(
              displayUrl,
              duplicate,
              duplicate.title_zh || duplicate.title_en
            );

            // Update state with the existing book's data
            state.updateState({
              ...duplicate,
              id: duplicate.id,  // Important for updates
              cover_image: duplicate.cover_image
            });

            return NextResponse.json({
              message: [
                `I found a potential duplicate and analyzed both covers:`,
                ``,
                `Existing Book:`,
                `- Title: ${duplicate.title_zh || duplicate.title_en}`,
                `- Quantity: ${duplicate.quantity}`,
                `- Category: ${duplicate.category?.type}`,
                ``,
                `Analysis Results:`,
                `- Confidence: ${duplicateAnalysis.confidence * 100}%`,
                ...duplicateAnalysis.reasons.map(reason => `- ${reason}`),
                ``,
                `Would you like to:`,
                `1. Update the existing book's quantity`,
                `2. Create a new listing anyway`,
                `3. Cancel the operation`
              ].join('\n'),
              analysis: {
                ...bookAnalysis,
                duplicate: duplicateAnalysis,
                existingBook: duplicate  // Include full book data
              },
              images: {
                existing: duplicate.cover_image,
                new: displayUrl
              }
            });
          }
        }

        return NextResponse.json({ 
          message: [
            `I've analyzed the book cover. Here's what I found:`,
            ``,
            `Title (English): ${bookAnalysis?.title_en || 'Not detected'}`,
            `Title (Chinese): ${bookAnalysis?.title_zh || 'Not detected'}`,
            ``,
            `All Extracted Text:`,
            `${formatExtractedText(bookAnalysis?.extracted_text) || 'No text extracted'}`,
            ``,
            `Suggested Tags: ${bookAnalysis?.search_tags?.join(', ') || 'None'}`,
            `Suggested Category: ${bookAnalysis?.category_suggestions?.join(', ') || 'None'}`,
            ``,
            `Would you like to create this book? Before we do, I'll need to know:`,
            `- How many copies do we have?`,
            `- Should we use any of the extracted text for the description?`,
            `- Would you like to use any of these terms as tags?`
          ].join('\n'),
          analysis: {
            ...bookAnalysis,
            cover_image: displayUrl  // Include cover image in response
          },
          imageUrl: displayUrl,
          bookData: state.getState() // Include full state in response
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
      
      // Enhanced logging
      console.log('Processing chat message:', {
        message,
        currentBookData,
        previousMessagesCount: previousMessages?.length
      });

      getChatResponse(
        message,
        {
          previousMessages: previousMessages || [],
          bookData: state.getState(),
          adminAction: 'chat'
        },
        async (chunk: string) => {
          await writer.write(encoder.encode(chunk));
        }
      ).then(async (finalResponse: AssistantResponse) => {
        console.log('Chat response:', finalResponse);

        // Update state while preserving existing data
        if (finalResponse.data) {
          const currentState = state.getState();
          
          // Create properly typed update object
          const stateUpdate: StateUpdates = {
            ...finalResponse.data,  // Let LLM provide all updates
            // Handle category conversion if needed
            category: typeof finalResponse.data.category === 'string' 
              ? {
                  id: '',
                  name_en: finalResponse.data.category,
                  name_zh: finalResponse.data.category,
                  type: finalResponse.data.category as CategoryType
                }
              : finalResponse.data.category || currentState.category,
            // Only preserve cover_image from current state
            cover_image: currentState.cover_image
          };

          state.updateState(stateUpdate);
        }

        // Log state before command execution
        console.log('State before command execution:', state.getState());

        // Execute command if action is present
        if (finalResponse.action && finalResponse.data) {
          try {
            const command = CommandFactory.createCommand(
              finalResponse.action as ChatAPIAction, 
              state
            );
            
            console.log('Executing command:', {
              action: finalResponse.action,
              data: finalResponse.data,
              currentState: state.getState()
            });

            const result = await command.execute(finalResponse.data);
            console.log('Command execution result:', result);

            // Add success message to stream
            const successMsg = `\n\nOperation successful! Book ${result.id ? 'updated' : 'created'}.`;
            await writer.write(encoder.encode(successMsg));
          } catch (error) {
            console.error('Command execution error:', error);
            const errorMsg = `\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`;
            await writer.write(encoder.encode(errorMsg));
          }
        }

        // Include full state in response
        await writer.write(
          encoder.encode(
            `\n__END_RESPONSE__${JSON.stringify({
              ...finalResponse,
              message: finalResponse.content,
              bookData: state.getState() // Include full state in response
            })}`
          )
        );
        await writer.close();
      }).catch(async (error: Error) => {
        console.error('Streaming error:', error);
        await writer.write(encoder.encode(`Error: ${error.message}`));
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