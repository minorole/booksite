export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'USER' | 'ADMIN'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'USER' | 'ADMIN'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'USER' | 'ADMIN'
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string
          category: string
          quantity: number
          image_urls: string[]
          metadata: Record<string, any>
          created_at: string
          updated_at: string
          donor_id: string | null
          location: string | null
          condition: string | null
          tags: string[]
          ai_metadata: Record<string, any> | null
          views: number
          category_id: string | null
          location_id: string | null
          embedding: number[] | null
        }
        Insert: {
          id?: string
          name: string
          description: string
          category: string
          quantity?: number
          image_urls?: string[]
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
          donor_id?: string | null
          location?: string | null
          condition?: string | null
          tags?: string[]
          ai_metadata?: Record<string, any> | null
          views?: number
          category_id?: string | null
          location_id?: string | null
          embedding?: number[] | null
        }
        Update: {
          id?: string
          name?: string
          description?: string
          category?: string
          quantity?: number
          image_urls?: string[]
          metadata?: Record<string, any>
          created_at?: string
          updated_at?: string
          donor_id?: string | null
          location?: string | null
          condition?: string | null
          tags?: string[]
          ai_metadata?: Record<string, any> | null
          views?: number
          category_id?: string | null
          location_id?: string | null
          embedding?: number[] | null
        }
      }
      // Add other tables based on schema.prisma
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      role: 'USER' | 'ADMIN'
      order_status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
    }
  }
} 