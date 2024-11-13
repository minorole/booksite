import OpenAI from 'openai';

// Initialize OpenAI with environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BookAnalysis {
  title_en: string;
  title_zh: string | null;
  description_en: string;
  description_zh: string;
  search_tags: string[];
  category_suggestions: string[];
}

export async function processBookImage(
  base64Image: string,
): Promise<BookAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `You are a Buddhist literature expert assistant. Analyze book covers and provide detailed, accurate information in both English and Chinese.
          Focus on Buddhist terminology accuracy and cultural context.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this Buddhist book cover and provide the following in JSON format:\n" +
                "1. English title (title_en)\n" +
                "2. Chinese title if present (title_zh)\n" +
                "3. English description, 100-150 words (description_en)\n" +
                "4. Chinese description (description_zh)\n" +
                "5. Search tags (search_tags)\n" +
                "6. Category suggestions (category_suggestions)"
            },
            {
              type: "text",
              text: base64Image
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.5,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      title_en: result.title_en || '',
      title_zh: result.title_zh || null,
      description_en: result.description_en || '',
      description_zh: result.description_zh || '',
      search_tags: result.search_tags || [],
      category_suggestions: result.category_suggestions || []
    };
  } catch (error) {
    console.error('Error processing book image:', error);
    throw new Error('Failed to process book image');
  }
}

export async function generateBookDescription(
  title: string,
  existingDescription?: string
): Promise<{ description_en: string; description_zh: string }> {
  try {
    const messages = [
      {
        role: "system" as const,
        content: `You are a Buddhist literature expert. Generate detailed, accurate book descriptions 
        in both English and Chinese. Focus on Buddhist terminology accuracy and cultural context.`
      },
      {
        role: "user" as const,
        content: `Generate a book description for "${title}" in both English (100-150 words) and Chinese.
        ${existingDescription ? `Current description: ${existingDescription}` : ''}`
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" }
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
  context?: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are an inventory management assistant for a Buddhist book distribution center.
          Help with tasks like adding new books, updating inventory, and managing orders.
          Provide clear, concise responses focused on the task at hand.
          ${context || ''}`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error getting chat response:', error);
    throw new Error('Failed to get chat response');
  }
} 