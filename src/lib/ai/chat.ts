import OpenAI from 'openai';
import { AssistantResponse, ChatMessage } from './types';
import { SYSTEM_PROMPTS } from './prompts';

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
    
    return {
      content: result.message || result.content,
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