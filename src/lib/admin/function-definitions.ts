import { type CategoryType } from '@prisma/client'
import { type ChatCompletionTool } from 'openai/resources/chat/completions'

export const adminTools: ChatCompletionTool[] = [
  {
    type: "function" as const,
    function: {
      name: "search_books",
      description: "ALWAYS search before any operation. Use this to check existence and get book IDs.",
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
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "create_book",
      description: "Create a new book listing. Only use after confirming no duplicate exists via search.",
      parameters: {
        type: "object",
        properties: {
          title_zh: {
            type: "string",
            description: "Chinese title of the book",
            nullable: true
          },
          title_en: {
            type: "string",
            description: "English title of the book",
            nullable: true
          },
          category_type: {
            type: "string",
            enum: ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
            description: "Category type of the book"
          },
          quantity: {
            type: "integer",
            description: "Initial quantity. Must be explicitly confirmed.",
            minimum: 0
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Tags for the book"
          },
          cover_image: {
            type: "string",
            description: "URL of the book cover image"
          }
        },
        required: ["category_type", "quantity", "tags", "cover_image"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "update_book",
      description: "Update an existing book. Must have book ID from search results.",
      parameters: {
        type: "object",
        properties: {
          book_id: {
            type: "string",
            description: "UUID of the book from search results",
            pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
          },
          quantity: {
            type: "integer",
            description: "New quantity",
            minimum: 0
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Complete new tag array. Will replace existing tags."
          }
        },
        required: ["book_id"]
      }
    }
  }
] 