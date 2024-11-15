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
  extracted_text: string;    
  confidence_score: number;  
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

export async function processBookImage(
  imageData: string,
  existingBooks?: Array<{ title_en: string; title_zh: string }>
): Promise<BookAnalysis> {
  try {
    // Ensure the image data is in the correct format
    let cleanImageData = imageData;
    
    // If it's a base64 string without prefix, add it
    if (!imageData.startsWith('data:image/')) {
      // Try to detect the image type from the base64 data
      const buffer = Buffer.from(imageData, 'base64');
      const type = detectImageType(buffer);
      cleanImageData = `data:image/${type};base64,${imageData}`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant for Buddhist book inventory management.
          Your task is to extract text from book images and provide structured analysis.
          
          IMPORTANT GUIDELINES:
          - Focus on extracting Chinese and English text accurately
          - Always preserve original Chinese characters exactly as shown
          - If you see Chinese text, it MUST be included in title_zh
          - Do not transliterate or translate between languages
          - If text is unclear, mark as null
          - Do not make assumptions or generate content
          - Do not interpret Buddhist concepts
          
          Return response in JSON format with the following structure:
          {
            "title_en": string | null,
            "title_zh": string | null,
            "description_en": string,
            "description_zh": string,
            "extracted_text": string,
            "confidence_score": number,
            "possible_duplicate": boolean,
            "duplicate_reasons": string[],
            "search_tags": string[],
            "category_suggestions": string[]
          }`
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
                url: cleanImageData,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0
    });

    if (!response.choices[0].message.content) {
      throw new Error('No response from OpenAI');
    }

    const content = response.choices[0].message.content.trim();
    // Clean the response - remove markdown formatting if present
    const jsonContent = content.replace(/```json\n|\n```/g, '').trim();

    try {
      const parsedResponse = JSON.parse(jsonContent) as BookAnalysis;
      
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
      console.error('Error parsing OpenAI response:', error);
      throw new Error('Failed to parse OpenAI response: Invalid JSON format');
    }

  } catch (error) {
    console.error('Error processing book image:', error);
    throw new Error('Failed to process book image: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
  }
): Promise<AssistantResponse> {
  try {
    const systemMessage = `You are an AI assistant for Buddhist book inventory management.
    
    DATABASE SCHEMA:
    Book {
      title_en: String (required if no title_zh)
      title_zh: String (required if no title_en)
      description_en: String
      description_zh: String
      cover_image: String (URL)
      quantity: Int (default: 0)
      category_id: String (required)
      search_tags: String[]
      ai_metadata: Json
    }

    Category {
      name_en: String
      name_zh: String
      type: CategoryType
    }

    Available Categories:
    - Pure Land Buddhist Books (净土佛书)
    - Other Buddhist Books (其他佛书)
    - Dharma Items (法宝)
    - Buddha Statues (佛像)

    Important guidelines:
    - At least one title (English or Chinese) is required
    - When creating a book listing:
      1. Verify all required fields are present
      2. Ensure titles match the original text exactly
      3. Assign to one of the four main categories listed above
      4. Search tags should include both English and Chinese terms
      5. Descriptions should be factual and avoid interpretation
    
    - Maintain context from previous messages
    - When users provide Chinese text, use it exactly as given
    - Never interpret Buddhist teachings
    - Never modify or translate provided Chinese text
    
    For book creation:
    - When user confirms, verify all required data is present
    - Ask for any missing required information
    - Confirm successful creation with the user
    - If creation fails, explain the error and ask if they want to try again`;

    const messages = [
      {
        role: "system" as const,
        content: systemMessage
      },
      ...context.previousMessages.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      })),
      {
        role: "user" as const,
        content: message
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
      temperature: 0
    });

    if (!response.choices[0].message.content) {
      throw new Error('No response from OpenAI');
    }

    const content = response.choices[0].message.content;
    const contentLowerCase = content.toLowerCase();

    // Determine certainty and review needs
    const needsReview = 
      contentLowerCase.includes('book content') || 
      contentLowerCase.includes('buddhist teaching') ||
      contentLowerCase.includes('dharma');

    const certainty = needsReview ? 'low' : 'high';

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