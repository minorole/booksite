export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_email: string
          book_id: string | null
          book_title: string | null
          confidence: number | null
          created_at: string
          id: string
          llm_context: Json | null
          metadata: Json | null
          prompt_version: number | null
          related_items: string[] | null
          session_id: string | null
        }
        Insert: {
          action: string
          admin_email: string
          book_id?: string | null
          book_title?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          llm_context?: Json | null
          metadata?: Json | null
          prompt_version?: number | null
          related_items?: string[] | null
          session_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          book_id?: string | null
          book_title?: string | null
          confidence?: number | null
          created_at?: string
          id?: string
          llm_context?: Json | null
          metadata?: Json | null
          prompt_version?: number | null
          related_items?: string[] | null
          session_id?: string | null
        }
        Relationships: []
      }
      book_tags: {
        Row: {
          book_id: string
          tag_id: string
        }
        Insert: {
          book_id: string
          tag_id: string
        }
        Update: {
          book_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_tags_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author_en: string | null
          author_zh: string | null
          category_id: string
          content_summary_en: string | null
          content_summary_zh: string | null
          cover_image: string | null
          created_at: string
          description_en: string | null
          description_zh: string
          discontinued: boolean
          discontinued_at: string | null
          discontinued_by: string | null
          discontinued_reason: string | null
          has_english_translation: boolean
          id: string
          image_analysis_data: Json | null
          last_llm_analysis: string | null
          last_quantity_update: string | null
          publisher_en: string | null
          publisher_zh: string | null
          quantity: number
          search_tsv_en: unknown | null
          title_en: string | null
          title_zh: string
          updated_at: string
          views: number
        }
        Insert: {
          author_en?: string | null
          author_zh?: string | null
          category_id: string
          content_summary_en?: string | null
          content_summary_zh?: string | null
          cover_image?: string | null
          created_at?: string
          description_en?: string | null
          description_zh: string
          discontinued?: boolean
          discontinued_at?: string | null
          discontinued_by?: string | null
          discontinued_reason?: string | null
          has_english_translation?: boolean
          id?: string
          image_analysis_data?: Json | null
          last_llm_analysis?: string | null
          last_quantity_update?: string | null
          publisher_en?: string | null
          publisher_zh?: string | null
          quantity?: number
          search_tsv_en?: unknown | null
          title_en?: string | null
          title_zh: string
          updated_at?: string
          views?: number
        }
        Update: {
          author_en?: string | null
          author_zh?: string | null
          category_id?: string
          content_summary_en?: string | null
          content_summary_zh?: string | null
          cover_image?: string | null
          created_at?: string
          description_en?: string | null
          description_zh?: string
          discontinued?: boolean
          discontinued_at?: string | null
          discontinued_by?: string | null
          discontinued_reason?: string | null
          has_english_translation?: boolean
          id?: string
          image_analysis_data?: Json | null
          last_llm_analysis?: string | null
          last_quantity_update?: string | null
          publisher_en?: string | null
          publisher_zh?: string | null
          quantity?: number
          search_tsv_en?: unknown | null
          title_en?: string | null
          title_zh?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "books_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string
          book_id: string
          cart_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          added_at?: string
          book_id: string
          cart_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          added_at?: string
          book_id?: string
          cart_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description_en: string | null
          description_zh: string | null
          id: string
          name_en: string
          name_zh: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_zh?: string | null
          id?: string
          name_en: string
          name_zh: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_zh?: string | null
          id?: string
          name_en?: string
          name_zh?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          added_at: string
          book_id: string
          order_id: string
          quantity: number
        }
        Insert: {
          added_at?: string
          book_id: string
          order_id: string
          quantity: number
        }
        Update: {
          added_at?: string
          book_id?: string
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          llm_processing_log: Json | null
          notes: string | null
          override_monthly: boolean
          processed_by: string | null
          processing_started_at: string | null
          shipping_address_id: string
          status: string
          total_items: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          llm_processing_log?: Json | null
          notes?: string | null
          override_monthly?: boolean
          processed_by?: string | null
          processing_started_at?: string | null
          shipping_address_id: string
          status?: string
          total_items: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          llm_processing_log?: Json | null
          notes?: string | null
          override_monthly?: boolean
          processed_by?: string | null
          processing_started_at?: string | null
          shipping_address_id?: string
          status?: string
          total_items?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "shipping_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          language_preference: string | null
          last_order_date: string | null
          name: string | null
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          language_preference?: string | null
          last_order_date?: string | null
          name?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          language_preference?: string | null
          last_order_date?: string | null
          name?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_addresses: {
        Row: {
          address1: string
          address2: string | null
          city: string
          country: string
          created_at: string
          id: string
          is_valid: boolean
          state: string
          updated_at: string
          user_id: string
          validation_log: Json | null
          zip: string
        }
        Insert: {
          address1: string
          address2?: string | null
          city: string
          country?: string
          created_at?: string
          id?: string
          is_valid?: boolean
          state: string
          updated_at?: string
          user_id: string
          validation_log?: Json | null
          zip: string
        }
        Update: {
          address1?: string
          address2?: string | null
          city?: string
          country?: string
          created_at?: string
          id?: string
          is_valid?: boolean
          state?: string
          updated_at?: string
          user_id?: string
          validation_log?: Json | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      can_place_order: {
        Args: { items_count: number; user_id: string }
        Returns: boolean
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      list_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
        }[]
      }
      list_users_paginated: {
        Args: { page_limit?: number; page_offset?: number; q?: string }
        Returns: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          total_count: number
        }[]
      }
      place_order: {
        Args: { items: Json; shipping_address_id: string; user_id: string }
        Returns: string
      }
      search_books: {
        Args: {
          after_id?: string
          after_updated_at?: string
          category_type?: string
          page_limit?: number
          q?: string
          tag_names?: string[]
        }
        Returns: {
          author_en: string | null
          author_zh: string | null
          category_id: string
          content_summary_en: string | null
          content_summary_zh: string | null
          cover_image: string | null
          created_at: string
          description_en: string | null
          description_zh: string
          discontinued: boolean
          discontinued_at: string | null
          discontinued_by: string | null
          discontinued_reason: string | null
          has_english_translation: boolean
          id: string
          image_analysis_data: Json | null
          last_llm_analysis: string | null
          last_quantity_update: string | null
          publisher_en: string | null
          publisher_zh: string | null
          quantity: number
          search_tsv_en: unknown | null
          title_en: string | null
          title_zh: string
          updated_at: string
          views: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      update_user_role: {
        Args: { new_role: string; uid: string }
        Returns: undefined
      }
      update_user_role_secure: {
        Args: { new_role: string; uid: string }
        Returns: undefined
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
