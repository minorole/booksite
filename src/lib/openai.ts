import OpenAI from 'openai';

// Initialize OpenAI with environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BookAnalysis {
  title_en: string | null;
  title_zh: string | null;
  description_en: string;
  description_zh: string;
  extracted_text: string;    // Raw text extracted from image
  confidence_score: number;  // Confidence in text extraction
  possible_duplicate: boolean;
  duplicate_reasons?: string[];
  search_tags: string[];
  category_suggestions: string[];
}

interface AssistantResponse {
  content: string;
  certainty: 'high' | 'medium' | 'low' | 'unknown';
  needs_review: boolean;
}

function truncateBase64(base64Image: string): string {
  // Remove data URL prefix if present
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
  
  // If the base64 string is too long (causing token limit issues)
  // we'll truncate it and add padding if needed
  const maxLength = 100000; // Adjust based on model token limits
  if (base64Data.length > maxLength) {
    const truncated = base64Data.slice(0, maxLength);
    // Add padding if needed
    const padding = truncated.length % 4;
    if (padding) {
      return truncated + '='.repeat(4 - padding);
    }
    return truncated;
  }
  
  return base64Data;
}

export async function processBookImage(
  imageUrl: string,
  existingBooks?: Array<{ title_en: string; title_zh: string }>
): Promise<BookAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for Buddhist book inventory management.
          Your task is to extract only visible text from book images and provide structured analysis.
          IMPORTANT: Return only a pure JSON object without any markdown formatting or code blocks.
          - Only extract text you can clearly see
          - If text is unclear, mark as null
          - Do not make assumptions or generate content
          - Do not interpret or explain Buddhist concepts
          - Check for exact matches with existing titles
          - Provide accurate descriptions in both languages
          - Generate relevant search tags and categories`
        },
        {
          role: "user",
          content: `Analyze this book image and extract visible text. Return a pure JSON object.
          Image URL: ${imageUrl}
          ${existingBooks ? `Check for duplicates against: ${JSON.stringify(existingBooks)}` : ''}`
        }
      ],
      max_tokens: 4096,
      response_format: { type: "json_object" },
      temperature: 0
    });

    if (!response.choices[0].message.content) {
      throw new Error('No response from OpenAI');
    }

    let content = response.choices[0].message.content;
    
    // Clean up the response if it contains markdown or code blocks
    if (content.includes('```')) {
      // Extract JSON from markdown code block if present
      const match = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      content = match ? match[1] : content;
    }

    // Remove any remaining markdown formatting
    content = content.replace(/```json|```/g, '').trim();

    // Parse and validate response
    const parsedResponse = JSON.parse(content) as BookAnalysis;
    
    return {
      title_en: parsedResponse.title_en || null,
      title_zh: parsedResponse.title_zh || null,
      description_en: parsedResponse.description_en || '',
      description_zh: parsedResponse.description_zh || '',
      extracted_text: parsedResponse.extracted_text || '',
      confidence_score: parsedResponse.confidence_score || 0,
      possible_duplicate: parsedResponse.possible_duplicate || false,
      duplicate_reasons: parsedResponse.duplicate_reasons || [],
      search_tags: parsedResponse.search_tags || [],
      category_suggestions: parsedResponse.category_suggestions || []
    };

  } catch (error) {
    console.error('Error processing book image:', error);
    throw new Error('Failed to process book image: ' + (error instanceof Error ? error.message : 'Unknown error'));
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

export async function getChatResponse(
  message: string,
  context?: {
    bookData?: any,
    adminAction?: string,
    previousMessages?: Array<{role: string, content: string}>
  }
): Promise<AssistantResponse> {
  try {
    const systemMessage = `You are an AI assistant for Buddhist book inventory management.
    Important guidelines:
    - If uncertain, say so explicitly
    - Don't make assumptions about book content
    - Direct Buddhist content questions to AMTBCF staff
    - Focus only on inventory management
    - Never interpret or explain Buddhist teachings
    - Never generate content about Buddhist concepts`;

    const messages = [
      {
        role: "system" as const,
        content: systemMessage
      },
      ...(context?.previousMessages || []).map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      })),
      {
        role: "user" as const,
        content: message
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",  // Using the specified model from PRD
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: 0
    });

    if (!response.choices[0].message.content) {
      throw new Error('No response from OpenAI');
    }

    const content = response.choices[0].message.content;

    // Analyze response for uncertainty markers
    const uncertaintyMarkers = [
      'not sure', 'might', 'maybe', 'could be', 'possibly',
      'I think', 'appears to', 'seems like', 'uncertain'
    ];
    
    const contentLowerCase = content.toLowerCase();
    const hasUncertaintyMarkers = uncertaintyMarkers.some(marker => 
      contentLowerCase.includes(marker)
    );

    // Check if response needs human review
    const needsReview = 
      contentLowerCase.includes('book content') || 
      contentLowerCase.includes('buddhist teaching') ||
      contentLowerCase.includes('dharma') ||
      hasUncertaintyMarkers;

    // Determine certainty level
    let certainty: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
    if (hasUncertaintyMarkers) {
      certainty = 'low';
    } else if (content.length > 500) {
      certainty = 'medium';
    } else if (!needsReview) {
      certainty = 'high';
    }

    return {
      content,
      certainty,
      needs_review: needsReview
    };

  } catch (error) {
    console.error('Error getting chat response:', error);
    throw new Error('Failed to get chat response');
  }
}

export type { BookAnalysis, AssistantResponse };