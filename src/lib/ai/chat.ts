import OpenAI from 'openai';
import { AssistantResponse, ChatMessage } from './types';
import { SYSTEM_PROMPTS } from './prompts';
import { getBookStats, searchBooks } from '../services/book-service';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatContext {
  bookData?: any;
  adminAction?: string;
  previousMessages: ChatMessage[];
}

export async function getChatResponse(
  message: string,
  context: ChatContext
): Promise<AssistantResponse> {
  try {
    console.log('Getting chat response for:', {
      message,
      contextBookData: context.bookData ? {
        title_zh: context.bookData.title_zh,
        quantity: context.bookData.quantity
      } : null,
      previousMessagesCount: context.previousMessages.length
    });

    // Convert messages to proper OpenAI message format
    const messages = [
      {
        role: "system" as const,
        content: SYSTEM_PROMPTS.chatAssistant
      },
      ...context.previousMessages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content
      })),
      {
        role: "user" as const,
        content: message
      }
    ];

    console.log('Sending to OpenAI:', {
      messageCount: messages.length,
      lastUserMessage: message
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      temperature: 0
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    console.log('OpenAI response:', {
      action: result.action,
      data: result.data,
      messagePreview: result.message?.slice(0, 100)
    });
    
    // Add database query handling
    if (result.action === 'QUERY_DATABASE') {
      try {
        let queryResult;
        
        switch (result.data?.queryType) {
          case 'stats':
            queryResult = await getBookStats();
            break;
          case 'search':
            queryResult = await searchBooks(result.data.searchTerm);
            break;
          default:
            queryResult = null;
        }

        // Let LLM format the response
        const formattedResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            ...messages,
            {
              role: "assistant",
              content: JSON.stringify(queryResult)
            }
          ],
          temperature: 0
        });

        result.message = formattedResponse.choices[0].message.content || result.message;
      } catch (error) {
        // Let LLM handle the error naturally
        result.message = `I encountered an issue while checking that: ${error instanceof Error ? error.message : 'Unknown error'}. Would you like to try a different query?`;
      }
    }

    // Add database verification after updates
    if (result.action === 'UPDATE_BOOK' || result.action === 'CREATE_BOOK') {
      try {
        // After the update/create operation succeeds
        const verificationQuery = await searchBooks(
          result.data.title_zh || result.data.title_en || ''
        );

        // Let LLM format the verification response
        const verificationResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            ...messages,
            {
              role: "system",
              content: "The database has been updated. Here's the current state:"
            },
            {
              role: "assistant",
              content: JSON.stringify(verificationQuery)
            }
          ],
          temperature: 0
        });

        // Update the response message to include verification
        result.message = verificationResponse.choices[0].message.content || result.message;
      } catch (error) {
        console.error('Verification error:', error);
        // Continue with original message if verification fails
      }
    }

    return {
      content: result.message,
      action: result.action,
      data: result.data,
      certainty: result.certainty || 'high',
      needs_review: result.needs_review || false
    };

  } catch (error) {
    console.error('Error getting chat response:', error);
    throw new Error('Failed to get chat response');
  }
} 