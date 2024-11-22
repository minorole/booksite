import { prisma } from '../prisma';
import { openai } from '../openai';
import { SYSTEM_PROMPTS } from '../ai/prompts';
import { AI_CONSTANTS } from '../constants/ai';

interface DuplicateAnalysisResult {
  isDuplicate: boolean;
  confidence: number;
  reasons: string[];
  existingBook?: any;
}

export async function findPossibleDuplicates(
  title: string,
  searchTags: string[] = []
): Promise<{
  exactMatch?: any;
  similarMatches: any[];
}> {
  try {
    console.log('Searching for duplicates:', { title, searchTags });

    const exactMatch = await prisma.book.findFirst({
      where: {
        OR: [
          { title_zh: { equals: title, mode: 'insensitive' } },
          { title_en: { equals: title, mode: 'insensitive' } }
        ]
      },
      include: {
        category: true
      }
    });

    const similarMatches = await prisma.book.findMany({
      where: {
        AND: [
          {
            OR: [
              { title_zh: { contains: title, mode: 'insensitive' } },
              { title_en: { contains: title, mode: 'insensitive' } },
              { search_tags: { hasSome: [...searchTags, ...title.split(/\s+/)] } }
            ]
          },
          ...(exactMatch ? [{ id: { not: exactMatch.id } }] : [])
        ]
      },
      include: {
        category: true
      },
      take: 5
    });

    console.log(`Found ${similarMatches.length} potential matches${exactMatch ? ' and 1 exact match' : ''}`);
    return { exactMatch, similarMatches };

  } catch (error) {
    console.error('Error finding duplicates:', error);
    return { similarMatches: [] };
  }
}

export async function analyzeDuplicateWithImages(
  newImageUrl: string,
  existingBook: any,
  title: string
): Promise<DuplicateAnalysisResult> {
  try {
    console.log('Analyzing potential duplicate:', {
      newTitle: title,
      existingTitle: existingBook.title_zh || existingBook.title_en
    });

    const response = await openai.chat.completions.create({
      model: AI_CONSTANTS.MODEL,
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPTS.duplicateAnalysis}
          IMPORTANT: Respond in JSON format only.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze these two books and respond with a JSON object determining if they are the same:
              New book title: ${title}
              Existing book title: ${existingBook.title_zh || existingBook.title_en}
              
              Required JSON format:
              {
                "isDuplicate": boolean,
                "confidence": number,
                "reasons": string[],
                "existingBook": object | null
              }`
            },
            {
              type: "image_url",
              image_url: { url: newImageUrl }
            },
            {
              type: "image_url",
              image_url: { url: existingBook.cover_image }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    console.log('Duplicate analysis result:', result);

    return {
      ...result,
      existingBook: result.isDuplicate ? existingBook : undefined
    };
  } catch (error) {
    console.error('Error analyzing duplicate images:', error);
    return {
      isDuplicate: false,
      confidence: 0,
      reasons: ['Failed to analyze images']
    };
  }
} 