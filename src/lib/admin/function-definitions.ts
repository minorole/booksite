import { type ChatCompletionTool } from 'openai/resources/chat/completions'
import { type BookSearch, type BookCreate, type BookUpdate, type OrderUpdate } from './types'

export const adminTools: ChatCompletionTool[] = [
  {
    type: "function" as const,
    function: {
      name: "analyze_book_and_check_duplicates",
      description: "Analyze book cover image and check for duplicates in one operation",
      parameters: {
        type: "object",
        properties: {
          book_info: {
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
              },
              category_type: {
                type: "string",
                enum: ["PURE_LAND_BOOKS", "OTHER_BOOKS", "DHARMA_ITEMS", "BUDDHA_STATUES"],
                description: "Book category"
              },
              tags: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Relevant tags"
              }
            },
            required: ["title_zh", "category_type", "tags"]
          },
          image_url: {
            type: "string",
            description: "URL of the uploaded book cover"
          }
        },
        required: ["book_info", "image_url"]
      }
    }
  }
] as const 