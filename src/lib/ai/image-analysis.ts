import OpenAI from 'openai';
import { BookAnalysis } from './types';
import { SYSTEM_PROMPTS } from './prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function processBookImage(
  imageUrl: string
): Promise<BookAnalysis> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
                url: imageUrl,
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