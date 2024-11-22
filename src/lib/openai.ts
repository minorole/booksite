import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { SYSTEM_PROMPTS } from './ai/prompts';
import { BookAnalysis, AssistantResponse } from './ai/types';
import { AI_CONSTANTS } from './constants/ai';

// Export the OpenAI client instance
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to format extracted text
export function formatExtractedText(extractedText: any): string {
  if (!extractedText) return 'No text extracted';
  
  if (typeof extractedText === 'object') {
    if (extractedText.raw_text) {
      return extractedText.raw_text;
    }
    if (extractedText.positions) {
      const parts = [];
      if (extractedText.positions.title) {
        parts.push(`Title: ${extractedText.positions.title}`);
      }
      if (extractedText.positions.other && extractedText.positions.other.length > 0) {
        parts.push(`Other text: ${extractedText.positions.other.join(', ')}`);
      }
      return parts.join('\n');
    }
  }
  
  return String(extractedText);
}

// Export the existing functions with the formatting improvement
export async function processBookImage(
  imageData: string | { displayUrl: string; originalImageData: string }
): Promise<BookAnalysis> {
  try {
    console.log('Processing image data...');

    // Handle both string and object input
    const imageContent = typeof imageData === 'string' 
      ? imageData 
      : imageData.displayUrl;

    // Validate image data
    if (!imageContent) {
      throw new Error('No image data provided');
    }

    console.log('Using image URL:', imageContent);

    const response = await openai.chat.completions.create({
      model: AI_CONSTANTS.MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPTS.imageAnalysis
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this book cover and extract all visible text. Pay special attention to Chinese characters."
            },
            {
              type: "image_url",
              image_url: {
                url: imageContent,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: AI_CONSTANTS.MAX_OUTPUT_TOKENS,
      temperature: AI_CONSTANTS.TEMPERATURE
    });

    if (!response.choices[0].message.content) {
      throw new Error('No response from OpenAI');
    }

    const content = response.choices[0].message.content.trim();
    const jsonContent = content.replace(/```json\n|\n```/g, '').trim();

    try {
      const parsedResponse = JSON.parse(jsonContent) as BookAnalysis;
      
      return {
        title_en: parsedResponse.title_en || null,
        title_zh: parsedResponse.title_zh || null,
        description_en: parsedResponse.description_en || '',
        description_zh: parsedResponse.description_zh || '',
        extracted_text: parsedResponse.extracted_text || '',
        confidence_scores: parsedResponse.confidence_scores || {
          title: 0,
          language_detection: 0
        },
        possible_duplicate: parsedResponse.possible_duplicate || false,
        duplicate_reasons: parsedResponse.duplicate_reasons || [],
        search_tags: parsedResponse.search_tags || [],
        category_suggestions: parsedResponse.category_suggestions || []
      };
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Failed to parse OpenAI response: Invalid JSON format');
    }

  } catch (error) {
    console.error('Error details:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to process book image: ${error.message}`);
    }
    throw error;
  }
}

// Helper function to detect image type from buffer
function detectImageType(buffer: Buffer): string {
  const header = buffer.toString('hex', 0, 4);
  
  // Check magic numbers
  switch (header) {
    case 'ffd8ffe0':
    case 'ffd8ffe1':
    case 'ffd8ffe2':
      return 'jpeg';
    case '89504e47':
      return 'png';
    case '47494638':
      return 'gif';
    case '52494646':
      return 'webp';
    default:
      return 'jpeg'; // Default to JPEG if unknown
  }
}

export async function getChatResponse(
  message: string,
  context: {
    bookData?: any,
    adminAction?: string,
    previousMessages: Array<{role: string, content: string}>
  },
  onProgress?: (chunk: string) => void
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
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: SYSTEM_PROMPTS.chatAssistant
      },
      ...context.previousMessages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content
      })),
      {
        role: "user",
        content: message
      }
    ];

    if (onProgress) {
      const stream = await openai.chat.completions.create({
        model: AI_CONSTANTS.MODEL,
        messages,
        stream: true,
        temperature: AI_CONSTANTS.TEMPERATURE,
        response_format: { type: "json_object" }
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        onProgress(content);
      }

      try {
        // Parse the complete response
        const result = JSON.parse(fullResponse);
        console.log('Parsed streaming response:', result);
        
        return {
          content: result.message || result.content,
          action: result.action,
          data: result.data,
          certainty: result.certainty || 'high',
          needs_review: result.needs_review || false
        };
      } catch (error) {
        console.error('Error parsing streaming response:', error);
        throw new Error('Failed to parse streaming response');
      }
    } else {
      const response = await openai.chat.completions.create({
        model: AI_CONSTANTS.MODEL,
        messages,
        response_format: { type: "json_object" },
        temperature: AI_CONSTANTS.TEMPERATURE
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      console.log('OpenAI response:', result);
      
      return {
        content: result.message || result.content,
        action: result.action,
        data: result.data,
        certainty: result.certainty || 'high',
        needs_review: result.needs_review || false
      };
    }

  } catch (error) {
    console.error('Error getting chat response:', error);
    throw new Error('Failed to get chat response');
  }
}

export async function generateBookDescription(
  title: string,
  existingDescription?: string
): Promise<{ description_en: string; description_zh: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // Using the specified model from PRD
      messages: [
        {
          role: "system" as const,
          content: `You are an AI assistant for Buddhist book inventory management.
          - Generate factual, concise descriptions
          - Do not interpret Buddhist teachings
          - Focus on physical book details and general topics
          - Avoid doctrinal explanations
          - Maintain cultural sensitivity`
        },
        {
          role: "user" as const,
          content: `Generate a book description for "${title}" in both English (100-150 words) and Chinese.
          ${existingDescription ? `Current description: ${existingDescription}` : ''}`
        }
      ] as OpenAI.Chat.ChatCompletionMessageParam[],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      description_en: result.description_en || '',
      description_zh: result.description_zh || ''
    };
  } catch (error) {
    console.error('Error generating book description:', error);
    throw new Error('Failed to generate book description');
  }
}

export type { BookAnalysis, AssistantResponse };