import { type ChatCompletionTool } from 'openai/resources/chat/completions'
import { type CategoryType } from '@/lib/db/enums'

export const adminTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "analyze_book_cover",
      description: "Initial analysis of a book cover image. Use this for natural language analysis first, then structured data extraction.",
      parameters: {
        type: "object",
        properties: {
          image_url: {
            type: "string",
            description: "The image URL from the user's message"
          },
          stage: {
            type: "string",
            enum: ["initial", "structured"],
            description: "Analysis stage - 'initial' for natural language analysis, 'structured' for JSON data"
          },
          confirmed_info: {
            type: "object",
            description: "User confirmed information for structured stage",
            properties: {
              title_zh: { type: "string", description: "Confirmed Chinese title" },
              title_en: { type: "string", description: "Confirmed English title", nullable: true },
              author_zh: { type: "string", description: "Confirmed Chinese author", nullable: true },
              author_en: { type: "string", description: "Confirmed English author", nullable: true },
              publisher_zh: { type: "string", description: "Confirmed Chinese publisher", nullable: true },
              publisher_en: { type: "string", description: "Confirmed English publisher", nullable: true },
              category_type: { 
                type: "string",
                enum: ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
                description: "Confirmed category"
              }
            },
            nullable: true
          }
        },
        required: ["image_url", "stage"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_duplicates",
      description: "Check for duplicate books based on analyzed information. Call this after user confirms the analysis.",
      parameters: {
        type: "object",
        properties: {
          title_zh: {
            type: "string",
            description: "Chinese title extracted from image"
          },
          title_en: {
            type: "string",
            description: "English title if present",
            nullable: true
          },
          author_zh: {
            type: "string",
            description: "Chinese author name",
            nullable: true
          },
          author_en: {
            type: "string",
            description: "English author name",
            nullable: true
          },
          publisher_zh: {
            type: "string",
            description: "Chinese publisher name",
            nullable: true
          },
          publisher_en: {
            type: "string",
            description: "English publisher name",
            nullable: true
          }
        },
        required: ["title_zh"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_book",
      description: "Create a new book listing. Call this after confirming no duplicates exist.",
      parameters: {
        type: "object",
        properties: {
          title_zh: {
            type: "string",
            description: "Chinese title"
          },
          title_en: {
            type: "string",
            description: "English title",
            nullable: true
          },
          description_zh: {
            type: "string",
            description: "Chinese description"
          },
          description_en: {
            type: "string",
            description: "English description",
            nullable: true
          },
          category_type: {
            type: "string",
            enum: ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
            description: "Book category"
          },
          quantity: {
            type: "integer",
            description: "Initial inventory quantity",
            minimum: 0
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Relevant tags"
          },
          cover_image: {
            type: "string",
            description: "URL of the book cover image"
          },
          author_zh: {
            type: "string",
            description: "Chinese author name",
            nullable: true
          },
          author_en: {
            type: "string",
            description: "English author name",
            nullable: true
          },
          publisher_zh: {
            type: "string",
            description: "Chinese publisher name",
            nullable: true
          },
          publisher_en: {
            type: "string",
            description: "English publisher name",
            nullable: true
          }
        },
        required: ["title_zh", "description_zh", "category_type", "quantity", "tags", "cover_image"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_book",
      description: "Update an existing book listing. Call this when updating or when a duplicate is found.",
      parameters: {
        type: "object",
        properties: {
          book_id: {
            type: "string",
            description: "ID of the book to update"
          },
          title_zh: {
            type: "string",
            description: "Chinese title"
          },
          title_en: {
            type: "string",
            description: "English title",
            nullable: true
          },
          description_zh: {
            type: "string",
            description: "Chinese description",
            nullable: true
          },
          description_en: {
            type: "string",
            description: "English description",
            nullable: true
          },
          category_type: {
            type: "string",
            enum: ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
            description: "Book category"
          },
          quantity: {
            type: "integer",
            description: "Updated inventory quantity",
            minimum: 0
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Updated tags"
          }
        },
        required: ["book_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_books",
      description: "Search for books based on various criteria.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Search by title (Chinese or English)",
            nullable: true
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Search by tags",
            nullable: true
          },
          category_type: {
            type: "string",
            enum: ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
            description: "Filter by category",
            nullable: true
          },
          min_quantity: {
            type: "integer",
            description: "Minimum quantity",
            nullable: true
          },
          max_quantity: {
            type: "integer",
            description: "Maximum quantity",
            nullable: true
          }
        }
      }
    }
  }
] as const

export type AdminTool = typeof adminTools[number]["function"] 
