import { BookAnalysis } from './types';
import { openai } from '../openai';
import { SYSTEM_PROMPTS } from './prompts';
import { AI_CONSTANTS } from '../constants/ai';

export async function processBookImage(
  imageUrl: string
): Promise<BookAnalysis> {
  try {
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
                url: imageUrl,
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
    console.error('Error processing book image:', error);
    throw new Error('Failed to process book image: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
} 