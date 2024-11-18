import OpenAI from 'openai';

// Define our own type if needed
type ChatCompletionMessageParam = {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
};

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
  action?: 'UPDATE_TITLE' | 'UPDATE_QUANTITY' | 'CREATE_BOOK';
  data?: {
    title?: string;
    quantity?: number;
    category?: string;
  };
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
          
          VALID CATEGORIES (always return exactly these names):
          - Pure Land Buddhist Books (净土佛书)
          - Other Buddhist Books (其他佛书)
          - Dharma Items (法宝)
          - Buddha Statues (佛像)
          
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
    const systemPrompt = `You are an AI assistant for Buddhist book inventory management.
    
    Your task is to:
    1. Understand user intent from natural language
    2. Extract relevant information
    3. Return structured response with appropriate action

    IMPORTANT: You must respond with a valid JSON object containing:
    {
      "action": "UPDATE_TITLE" | "UPDATE_QUANTITY" | "CREATE_BOOK",
      "data": {
        "title"?: string,
        "quantity"?: number
      },
      "message": string,
      "certainty": "high" | "medium" | "low",
      "needs_review": boolean
    }

    WORKFLOW:
    1. If user provides a title or corrects title:
       Return { "action": "UPDATE_TITLE", "data": { "title": "新标题" } }
    2. If user mentions quantity (any number):
       Return { "action": "UPDATE_QUANTITY", "data": { "quantity": 5 } }
    3. If user confirms and we have title and quantity:
       Return { "action": "CREATE_BOOK" }
    4. If user confirms but missing data:
       Return message asking for missing information

    Example responses:
    User: "this should be 妙法蓮華經"
    {
      "action": "UPDATE_TITLE",
      "data": { "title": "妙法蓮華經" },
      "message": "Title updated. How many copies do you have?",
      "certainty": "high",
      "needs_review": false
    }

    User: "we have 5 copies"
    {
      "action": "UPDATE_QUANTITY",
      "data": { "quantity": 5 },
      "message": "Quantity set to 5. Please confirm to create the listing.",
      "certainty": "high",
      "needs_review": false
    }

    Always preserve exact Chinese characters.
    Never translate between languages.`;

    // Convert messages to proper OpenAI message format
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
      temperature: 0
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
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