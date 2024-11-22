import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage, getChatResponse, formatExtractedText } from '@/lib/openai';
import { uploadAndOptimizeImage } from '@/lib/cloudinary';
import { findPossibleDuplicates, analyzeDuplicateWithImages } from '@/lib/services/duplicate-detection';
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
    console.log('Chat API request:', {
      hasMessage: !!body.message,
      hasImage: !!body.image,
      previousMessagesCount: body.previousMessages?.length
    });

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

    // Find the most recent state data including the ID
    const lastMessageWithBookData = previousMessages
      ?.slice()
      .reverse()
      .find((msg: ChatMessage) => msg.bookData);

    console.log('Found last message with book data:', {
      hasBookData: !!lastMessageWithBookData?.bookData,
      bookId: lastMessageWithBookData?.bookData?.id
    });

    // Combine state data, prioritizing the most recent
    const initialState = {
      ...(lastMessageWithBookData?.bookData || {}),
      ...currentBookData,
      // Explicitly preserve these fields
      id: currentBookData?.id || lastMessageWithBookData?.bookData?.id,
      cover_image: currentBookData?.cover_image || 
                  lastMessageWithBookData?.bookData?.cover_image ||
                  lastMessageWithBookData?.imageUrl
    };

    // Create state only once
    const state = BookCreationState.getInstance(initialState);

    // Handle image upload
    if (image) {
      try {
        console.log('Processing image upload...');
        const { displayUrl } = await uploadAndOptimizeImage(image);
        console.log('Image uploaded:', { displayUrl });
        
        // Update state with new image but preserve ID
        state.updateState({
          cover_image: displayUrl,
          id: state.getState().id // Preserve existing ID
        });

        const bookAnalysis = await processBookImage(displayUrl);
        console.log('Book analysis result:', {
          title_zh: bookAnalysis.title_zh,
          title_en: bookAnalysis.title_en,
          confidence_scores: bookAnalysis.confidence_scores
        });

        // Check for duplicates if we have a title
        const title = bookAnalysis.title_zh || bookAnalysis.title_en;
        if (title) {
          console.log('Checking for duplicates:', { title });
          const { similarMatches } = await findPossibleDuplicates(
            title,
            bookAnalysis.search_tags
          );
          console.log('Found similar matches:', similarMatches.length);

          // If we found potential matches, analyze with LLM
          if (similarMatches.length > 0) {
            console.log('Analyzing potential duplicates...');
            for (const match of similarMatches) {
              const duplicateAnalysis = await analyzeDuplicateWithImages(
                displayUrl,
                match,
                title
              );

              // If LLM thinks it's a duplicate with high confidence, show comparison
              if (duplicateAnalysis.isDuplicate && duplicateAnalysis.confidence > 0.7) {
                return NextResponse.json({
                  message: [
                    `I found what appears to be the same book:`,
                    ``,
                    `Existing Book:`,
                    `- Title: ${match.title_zh || match.title_en}`,
                    `- Quantity: ${match.quantity}`,
                    `- Category: ${match.category?.type}`,
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
                    existingBook: match
                  },
                  images: {
                    existing: match.cover_image,
                    new: displayUrl
                  }
                });
              }
            }
          }
        }

        // If no duplicates found or confidence too low, continue with normal flow
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
            cover_image: displayUrl
          },
          imageUrl: displayUrl,
          bookData: state.getState()
        });

      } catch (error) {
        console.error('Error processing image:', error);
        throw error;
      }
    }

    // Handle text message with streaming
    if (message) {
      console.log('Processing chat message:', {
        message,
        currentBookId: state.getState().id
      });

      const encoder = new TextEncoder();
      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      
      let accumulatedResponse = '';

      getChatResponse(
        message,
        {
          previousMessages: previousMessages || [],
          bookData: state.getState(),
          adminAction: 'chat'
        },
        async (chunk: string) => {
          try {
            // Accumulate the raw response
            accumulatedResponse += chunk;
            
            // Check if this is a complete response
            if (chunk.includes('__END_RESPONSE__')) {
              const [content, jsonStr] = chunk.split('__END_RESPONSE__');
              const finalResponse = JSON.parse(jsonStr);
              
              // Only stream the user-facing message
              await writer.write(
                encoder.encode(finalResponse.content || finalResponse.message || content)
              );
            } else {
              // For intermediate chunks, check if it's JSON
              try {
                // Try to parse as JSON to filter out raw JSON chunks
                JSON.parse(chunk);
                // If it parses as JSON, don't write it
              } catch {
                // If it's not JSON, it's probably part of the message
                await writer.write(encoder.encode(chunk));
              }
            }
          } catch (error) {
            console.error('Error processing chunk:', error);
          }
        }
      ).then(async (finalResponse: AssistantResponse) => {
        console.log('Chat response:', finalResponse);

        // Update state while preserving existing data
        if (finalResponse.data) {
          const currentState = state.getState();
          
          // Create properly typed update object
          const stateUpdate: StateUpdates = {
            ...currentState, // Start with current state
            title_en: finalResponse.data.title_en ?? currentState.title_en,
            title_zh: finalResponse.data.title_zh ?? currentState.title_zh,
            description_en: finalResponse.data.description_en ?? currentState.description_en,
            description_zh: finalResponse.data.description_zh ?? currentState.description_zh,
            quantity: finalResponse.data.quantity ?? currentState.quantity,
            search_tags: finalResponse.data.search_tags ?? currentState.search_tags,
            cover_image: currentState.cover_image, // Preserve existing cover_image
            // Handle category properly
            category: finalResponse.data.category ? {
              id: '',
              name_en: finalResponse.data.category,
              name_zh: finalResponse.data.category,
              type: finalResponse.data.category
            } : currentState.category
          };

          state.updateState(stateUpdate);
        }

        // Log state before command execution
        console.log('State before command execution:', state.getState());

        // Execute command if action is present and it's not a duplicate CREATE_BOOK
        if (finalResponse.action && finalResponse.data) {
          try {
            // Only execute CREATE_BOOK if we don't have an ID yet
            if (finalResponse.action === ChatAPIAction.CREATE_BOOK && state.getState().id) {
              console.log('Skipping duplicate CREATE_BOOK command - book already exists');
            } else {
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
            }
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