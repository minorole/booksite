import { CategoryType } from "@prisma/client"

export interface Book {
  id: string
  title_en: string
  title_zh: string
  description_en: string
  description_zh: string
  cover_image: string | null
  quantity: number
  category: {
    id: string
    name_en: string
    name_zh: string
    type: CategoryType
  }
  search_tags: string[]
  created_at: string
  updated_at: string
} 