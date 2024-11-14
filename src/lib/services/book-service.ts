import { prisma } from '../prisma';
import type { BookAnalysis } from '@/components/admin/ai-chat/types';
import { v4 as uuidv4 } from 'uuid';

export async function createBookListing(
  data: BookAnalysis & { 
    cover_image: string;  // Cloudinary URL
  }
) {
  try {
    // Create the book
    const book = await prisma.book.create({
      data: {
        title_en: data.title_en || '',
        title_zh: data.title_zh || '',
        description_en: data.description_en,
        description_zh: data.description_zh,
        cover_image: data.cover_image,
        search_tags: data.search_tags,
        ai_metadata: {
          extracted_text: data.extracted_text,
          confidence_score: data.confidence_score,
          possible_duplicate: data.possible_duplicate,
          duplicate_reasons: data.duplicate_reasons || [],
          analysis_date: new Date().toISOString()
        },
        // If categories are provided, create or connect them
        ...(data.category_suggestions?.length && {
          category: {
            connectOrCreate: {
              where: {
                id: uuidv4()
              },
              create: {
                id: uuidv4(),
                name_en: data.category_suggestions[0],
                name_zh: data.category_suggestions[0]
              }
            }
          }
        })
      }
    });

    return book;
  } catch (error) {
    console.error('Error creating book listing:', error);
    throw new Error('Failed to create book listing');
  }
}

export async function checkDuplicateBook(
  title_en: string | null, 
  title_zh: string | null
) {
  if (!title_en && !title_zh) return null;

  const where = {
    OR: [
      ...(title_en ? [{ title_en }] : []),
      ...(title_zh ? [{ title_zh }] : [])
    ]
  };

  return await prisma.book.findFirst({ where });
} 