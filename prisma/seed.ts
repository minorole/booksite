import { PrismaClient, CategoryType } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  // Create categories
  const categories = [
    {
      type: 'PURE_LAND_BOOKS' as CategoryType,
      name_en: 'Pure Land Buddhist Books',
      name_zh: '净土佛书'
    },
    {
      type: 'OTHER_BOOKS' as CategoryType,
      name_en: 'Other Buddhist Books',
      name_zh: '其他佛书'
    },
    {
      type: 'DHARMA_ITEMS' as CategoryType,
      name_en: 'Dharma Items',
      name_zh: '法宝'
    },
    {
      type: 'BUDDHA_STATUES' as CategoryType,
      name_en: 'Buddha Statues',
      name_zh: '佛像'
    }
  ] as const;

  for (const category of categories) {
    // First find if category exists
    const existing = await prisma.category.findFirst({
      where: {
        type: category.type
      }
    });

    if (existing) {
      // Update if exists
      await prisma.category.update({
        where: {
          id: existing.id
        },
        data: {
          name_en: category.name_en,
          name_zh: category.name_zh
        }
      });
    } else {
      // Create if doesn't exist
      await prisma.category.create({
        data: {
          id: randomUUID(),
          type: category.type,
          name_en: category.name_en,
          name_zh: category.name_zh
        }
      });
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 