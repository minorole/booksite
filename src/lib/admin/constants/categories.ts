import { CategoryType } from '@prisma/client';

export const CATEGORY_MAP: Record<string, CategoryType> = {
  'PURE_LAND_BOOKS': CategoryType.PURE_LAND_BOOKS,
  'OTHER_BOOKS': CategoryType.OTHER_BOOKS,
  'DHARMA_ITEMS': CategoryType.DHARMA_ITEMS,
  'BUDDHA_STATUES': CategoryType.BUDDHA_STATUES,
  'Pure Land Books': CategoryType.PURE_LAND_BOOKS,
  'Other Books': CategoryType.OTHER_BOOKS,
  'Dharma Items': CategoryType.DHARMA_ITEMS,
  'Buddha Statues': CategoryType.BUDDHA_STATUES,
  '净土佛书': CategoryType.PURE_LAND_BOOKS,
  '其他佛书': CategoryType.OTHER_BOOKS,
  '法宝': CategoryType.DHARMA_ITEMS,
  '佛像': CategoryType.BUDDHA_STATUES
};

export const CATEGORY_NAMES: Record<CategoryType, { en: string; zh: string }> = {
  [CategoryType.PURE_LAND_BOOKS]: {
    en: 'Pure Land Books',
    zh: '净土佛书'
  },
  [CategoryType.OTHER_BOOKS]: {
    en: 'Other Books',
    zh: '其他佛书'
  },
  [CategoryType.DHARMA_ITEMS]: {
    en: 'Dharma Items',
    zh: '法宝'
  },
  [CategoryType.BUDDHA_STATUES]: {
    en: 'Buddha Statues',
    zh: '佛像'
  }
};

export function mapToCategoryType(categoryName: string): CategoryType {
  return CATEGORY_MAP[categoryName.trim()] || CategoryType.OTHER_BOOKS;
} 