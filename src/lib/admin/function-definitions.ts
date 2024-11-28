import { type ChatCompletionTool } from 'openai/resources/chat/completions'
import { type BookSearch, type BookCreate, type BookUpdate, type OrderUpdate } from './types'

export const adminTools: ChatCompletionTool[] = [
  {
    type: "function" as const,
    function: {
      name: "search_books",
      description: "Search books by various criteria. ALWAYS search before any operation.",
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
            description: "Filter by category type",
            nullable: true
          },
          min_quantity: {
            type: "integer",
            description: "Minimum quantity filter",
            nullable: true
          },
          max_quantity: {
            type: "integer",
            description: "Maximum quantity filter",
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
            description: "Chinese title of the book (required)"
          },
          title_en: {
            type: "string",
            description: "English title of the book",
            nullable: true
          },
          description_zh: {
            type: "string",
            description: "Chinese description of the book (required)"
          },
          description_en: {
            type: "string",
            description: "English description of the book",
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
          },
          author_zh: {
            type: "string",
            description: "Chinese name of the author",
            nullable: true
          },
          author_en: {
            type: "string",
            description: "English name of the author",
            nullable: true
          },
          publisher_zh: {
            type: "string",
            description: "Chinese name of the publisher",
            nullable: true
          },
          publisher_en: {
            type: "string",
            description: "English name of the publisher",
            nullable: true
          }
        },
        required: ["title_zh", "description_zh", "category_type", "quantity", "tags", "cover_image"]
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
          title_zh: {
            type: "string",
            description: "Updated Chinese title",
            nullable: true
          },
          title_en: {
            type: "string",
            description: "Updated English title",
            nullable: true
          },
          quantity: {
            type: "integer",
            description: "Updated quantity",
            minimum: 0,
            nullable: true
          },
          tags: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Updated tags array. Will replace existing tags.",
            nullable: true
          },
          category_type: {
            type: "string",
            enum: ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
            description: "Updated category type",
            nullable: true
          }
        },
        required: ["book_id"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "update_order",
      description: "Update order status and details",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "UUID of the order"
          },
          status: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"],
            description: "New status for the order"
          },
          tracking_number: {
            type: "string",
            description: "Shipping tracking number",
            nullable: true
          },
          admin_notes: {
            type: "string",
            description: "Admin notes about the order",
            nullable: true
          },
          override_monthly: {
            type: "boolean",
            description: "Override monthly order limit",
            nullable: true
          }
        },
        required: ["order_id", "status"]
      }
    }
  }
] as const 