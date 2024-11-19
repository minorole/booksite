import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { processBookImage, getChatResponse } from '@/lib/openai';
import { uploadAndOptimizeImage } from '@/lib/cloudinary';
import { prisma } from '@/lib/prisma';
import { 
  createBookListing, 
  findPossibleDuplicates,
  updateBookQuantity
} from '@/lib/services/book-service';
import { BookAnalysis, ChatAPIAction, AssistantResponse, ChatResponseData } from '@/components/admin/ai-chat/types';
import { CategoryType, Prisma } from '@prisma/client';

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
        console.log('Processing image upload...');
        const { displayUrl, originalImageData } = await uploadAndOptimizeImage(image);
        console.log('Image uploaded to:', displayUrl);
        
        const bookAnalysis = await processBookImage(originalImageData);
        console.log('Book analysis result:', bookAnalysis);

        // Check for duplicates early if we have a title
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

    // Get chat response with proper typing
    console.log('Getting chat response for message:', message);
    console.log('Context:', {
      previousMessagesCount: previousMessages?.length || 0,
      hasBookData: !!currentBookData,
      action: 'chat'
    });

    // Let the LLM interpret the user's intent
    const chatResponse = await getChatResponse(message, {
      previousMessages: previousMessages || [],
      bookData: currentBookData,
      adminAction: 'chat'
    }) as AssistantResponse;

    console.log('Chat response:', chatResponse);

    // Handle update actions
    if (chatResponse.action && chatResponse.data) {
      const bookId = currentBookData?.id || currentBookData?.duplicate?.book?.id;
      const updateData: Prisma.BookUpdateInput = {};
      let successMessage = '';

      switch (chatResponse.action) {
        case 'UPDATE_DESCRIPTION':
          if (chatResponse.data.description_en || chatResponse.data.description_zh) {
            if (chatResponse.data.description_en) {
              updateData.description_en = chatResponse.data.description_en;
              successMessage = 'Updated English description.';
            }
            if (chatResponse.data.description_zh) {
              updateData.description_zh = chatResponse.data.description_zh;
              successMessage += (successMessage ? ' ' : '') + 'Updated Chinese description.';
            }

            // If we have a book ID, update the existing book
            if (bookId) {
              const result = await prisma.book.update({
                where: { id: bookId },
                data: updateData,
                include: {
                  category: true
                }
              });

              return NextResponse.json({
                message: [
                  successMessage,
                  ``,
                  `Current book details:`,
                  `Title: ${result.title_zh || result.title_en}`,
                  `Description (ZH): ${result.description_zh || 'None'}`,
                  `Description (EN): ${result.description_en || 'None'}`,
                  `Category: ${result.category.name_zh}`,
                  `Tags: ${result.search_tags.join(', ')}`,
                  `Quantity: ${result.quantity}`,
                  ``,
                  `Would you like to update anything else?`
                ].join('\n'),
                action: chatResponse.action,
                data: {
                  updatedBook: result
                }
              });
            }
          }
          break;

        case 'UPDATE_TAGS':
          if (chatResponse.data.search_tags) {
            // Combine existing tags with new ones
            const existingTags = currentBookData?.search_tags || [];
            const newTags = chatResponse.data.search_tags;
            const combinedTags = [...new Set([...existingTags, ...newTags])];
            
            updateData.search_tags = combinedTags;
            successMessage = `Updated tags: ${combinedTags.join(', ')}`;
          }
          break;

        case 'UPDATE_CATEGORY':
          if (chatResponse.data.category) {
            // Find category by type first
            const category = await prisma.category.findFirst({
              where: { type: chatResponse.data.category as CategoryType }
            });
            
            if (category) {
              updateData.category = {
                connect: { id: category.id }
              };
              successMessage = `Updated category to: ${chatResponse.data.category}`;
            }
          }
          break;

        case 'UPDATE_QUANTITY':
          if (chatResponse.data.quantity && bookId) {
            try {
              const result = await updateBookQuantity(
                bookId,
                chatResponse.data.quantity
              );

              if (!result.success) {
                throw new Error(result.error);
              }

              return NextResponse.json({
                message: `Updated quantity to ${chatResponse.data.quantity}.`,
                action: chatResponse.action,
                data: {
                  updatedBook: result.book
                }
              });
            } catch (error) {
              return NextResponse.json({ 
                error: 'Failed to update quantity',
                details: error instanceof Error ? error.message : 'Unknown error'
              }, { status: 500 });
            }
          } else {
            return NextResponse.json({ 
              error: 'No book ID found for quantity update',
              details: 'Book ID is required to update quantity'
            }, { status: 400 });
          }
          break;

        case 'UPDATE_TITLE':
          if (chatResponse.data.title) {
            updateData.title_zh = chatResponse.data.title;
            updateData.title_en = chatResponse.data.title;
            successMessage = `Updated title to: ${chatResponse.data.title}`;
          }
          break;

        case 'CREATE_BOOK':
          try {
            if (!currentBookData) {
              throw new Error('No book data available');
            }

            // Check if quantity is confirmed
            if (!chatResponse.data?.confirmed) {
              return NextResponse.json({
                message: "What should be the initial quantity for this book?",
                action: 'CONFIRM_QUANTITY',
                data: {
                  quantity: 0
                }
              });
            }

            // Ensure we have all the data
            const bookToCreate = {
              ...currentBookData,
              quantity: chatResponse.data.quantity || 0,
              cover_image: currentBookData.cover_image || '',
              search_tags: currentBookData.search_tags || [],
            };

            console.log('Creating book with data:', bookToCreate);

            const result = await createBookListing(bookToCreate);

            if (!result.success) {
              throw new Error(result.error);
            }

            return NextResponse.json({
              message: [
                `Book listing created successfully!`,
                ``,
                `Title: ${result.book.title_zh || result.book.title_en}`,
                `Category: ${result.book.category.name_zh}`,
                `Quantity: ${result.book.quantity}`,
                `Tags: ${result.book.search_tags.join(', ')}`,
                ``,
                `Would you like to add another book?`
              ].join('\n'),
              action: chatResponse.action,
              data: {
                book: result.book
              }
            });
          } catch (error) {
            return NextResponse.json({
              error: 'Failed to create book listing',
              details: error instanceof Error ? error.message : 'Unknown error'
            }, { status: 500 });
          }
          break;
      }

      if (Object.keys(updateData).length > 0 && bookId) {
        const result = await prisma.book.update({
          where: { id: bookId },
          data: updateData,
          include: {
            category: true
          }
        });

        return NextResponse.json({
          message: [
            successMessage,
            ``,
            `Current book details:`,
            `Title: ${result.title_zh || result.title_en}`,
            `Description (ZH): ${result.description_zh || 'None'}`,
            `Description (EN): ${result.description_en || 'None'}`,
            `Category: ${result.category.name_zh}`,
            `Tags: ${result.search_tags.join(', ')}`,
            `Quantity: ${result.quantity}`,
            ``,
            `Would you like to update anything else?`
          ].join('\n'),
          action: chatResponse.action,
          data: {
            ...chatResponse.data,
            updatedBook: result
          }
        });
      }
    }

    // Return default response
    return NextResponse.json({
      message: chatResponse.content,
      action: chatResponse.action,
      data: chatResponse.data
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 