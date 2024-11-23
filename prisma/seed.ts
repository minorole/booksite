import { PrismaClient, CategoryType, Role } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function handleDatabaseOperation<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (
      error && 
      typeof error === 'object' && 
      'code' in error && 
      error.code === 'P2021'
    ) {
      console.log('Table not yet created, skipping operation');
      return null;
    }
    throw error;
  }
}

async function main() {
  // Get super admin email at the start
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  
  // Create categories first (no dependencies)
  const categories = [
    {
      type: 'PURE_LAND_BOOKS' as CategoryType,
      name_en: 'Pure Land Buddhist Books',
      name_zh: '净土佛书',
      description_en: 'Books related to Pure Land Buddhism practices and teachings',
      description_zh: '与净土法门修持和教义相关的书籍'
    },
    {
      type: 'OTHER_BOOKS' as CategoryType,
      name_en: 'Other Buddhist Books',
      name_zh: '其他佛书',
      description_en: 'Other Buddhist texts and teachings',
      description_zh: '其他佛教典籍与教义'
    },
    {
      type: 'DHARMA_ITEMS' as CategoryType,
      name_en: 'Dharma Items',
      name_zh: '法宝',
      description_en: 'Buddhist practice items and materials',
      description_zh: '佛教修持用品与材料'
    },
    {
      type: 'BUDDHA_STATUES' as CategoryType,
      name_en: 'Buddha Statues',
      name_zh: '佛像',
      description_en: 'Buddhist statues and figurines',
      description_zh: '佛像与圣像'
    }
  ] as const;

  // Seed categories
  for (const category of categories) {
    await handleDatabaseOperation(async () => {
      const existing = await prisma.category.findFirst({
        where: { type: category.type }
      });

      if (existing) {
        await prisma.category.update({
          where: { id: existing.id },
          data: {
            name_en: category.name_en,
            name_zh: category.name_zh,
            description_en: category.description_en,
            description_zh: category.description_zh
          }
        });
      } else {
        await prisma.category.create({
          data: {
            id: randomUUID(),
            ...category
          }
        });
      }
    });
  }

  // Create system settings
  const systemSettings = [
    {
      key: 'monthly_order_limit',
      value: { limit: 20 },
      description: 'Maximum number of items per order'
    },
    {
      key: 'llm_settings',
      value: {
        model: "gpt-4o",
        context_window: 128_000,
        max_output_tokens: 16_384,
        temperature: 0,
        min_confidence: 0.85,
        auto_approve_threshold: 0.95
      },
      description: 'LLM processing settings'
    },
    {
      key: 'cart_expiry',
      value: { hours: 72 },
      description: 'Cart expiration time in hours'
    },
    {
      key: 'admin_emails',
      value: {
        super_admin: superAdminEmail || '',
        support_email: 'support@amtbcf.org'
      },
      description: 'Admin email addresses'
    }
  ];

  // Seed system settings
  for (const setting of systemSettings) {
    await handleDatabaseOperation(async () => {
      const existing = await prisma.systemSettings.findUnique({
        where: { key: setting.key }
      });

      if (!existing) {
        await prisma.systemSettings.create({
          data: {
            id: randomUUID(),
            ...setting
          }
        });
      }
    });
  }

  // Create system prompts
  const systemPrompts = [
    {
      name: 'book_analysis',
      prompt_text: 'Analyze the following Buddhist book cover image and extract: 1. Title in Chinese and English if available, 2. Potential category, 3. Relevant tags. Focus on Buddhist terminology and concepts.',
      use_case: 'IMAGE_ANALYSIS',
      version: 1,
      is_active: true
    },
    {
      name: 'duplicate_check',
      prompt_text: 'Compare the following book details with existing database entries. Check for: 1. Similar titles, 2. Similar content descriptions, 3. Visual similarities in cover images. Consider variations in translation.',
      use_case: 'DUPLICATE_CHECK',
      version: 1,
      is_active: true
    },
    {
      name: 'tag_generation',
      prompt_text: 'Generate relevant tags for the following Buddhist book. Focus on: 1. Main concepts, 2. Practice methods, 3. Target audience. Use both Chinese and English terms when appropriate.',
      use_case: 'TAG_GENERATION',
      version: 1,
      is_active: true
    },
    {
      name: 'content_summary',
      prompt_text: 'Create a bilingual summary of the book content based on available information. Focus on main teachings and practice methods.',
      use_case: 'CONTENT_SUMMARY',
      version: 1,
      is_active: true
    },
    {
      name: 'translation_check',
      prompt_text: 'Verify the accuracy of title translations between Chinese and English. Consider Buddhist terminology conventions.',
      use_case: 'TRANSLATION_CHECK',
      version: 1,
      is_active: true
    }
  ];

  // Seed system prompts
  for (const prompt of systemPrompts) {
    await handleDatabaseOperation(async () => {
      const existing = await prisma.systemPrompt.findFirst({
        where: { 
          name: prompt.name,
          version: prompt.version 
        }
      });

      if (!existing) {
        await prisma.systemPrompt.create({
          data: {
            id: randomUUID(),
            ...prompt
          }
        });
      }
    });
  }

  // Finally, create super admin user
  if (superAdminEmail) {
    await handleDatabaseOperation(async () => {
      const existingSuperAdmin = await prisma.user.findUnique({
        where: { email: superAdminEmail }
      });

      if (!existingSuperAdmin) {
        await prisma.user.create({
          data: {
            id: randomUUID(),
            email: superAdminEmail,
            role: Role.SUPER_ADMIN,
            name: 'Super Admin'
          }
        });
        console.log('Created super admin user');
      }
    });
  } else {
    console.log('No super admin email provided in environment variables');
  }

  console.log('Database seeding completed');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })