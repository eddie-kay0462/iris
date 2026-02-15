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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      inner_circle_invitations: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          invitation_token: string
          used_at: string | null
          waitlist_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          invitation_token: string
          used_at?: string | null
          waitlist_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          invitation_token?: string
          used_at?: string | null
          waitlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inner_circle_invitations_waitlist_id_fkey"
            columns: ["waitlist_id"]
            isOneToOne: false
            referencedRelation: "waitlist"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string | null
          product_name: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          discount: number | null
          id: string
          is_inner_circle_order: boolean | null
          order_number: string
          paystack_reference: string | null
          shipping_address: Json | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          id?: string
          is_inner_circle_order?: boolean | null
          order_number: string
          paystack_reference?: string | null
          shipping_address?: Json | null
          status?: string | null
          subtotal: number
          total: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          id?: string
          is_inner_circle_order?: boolean | null
          order_number?: string
          paystack_reference?: string | null
          shipping_address?: Json | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          title: string
          handle: string
          description: string | null
          base_price: number | null
          compare_at_price: number | null
          status: string | null
          gender: string | null
          product_type: string | null
          vendor: string | null
          tags: string[] | null
          published: boolean | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          title: string
          handle: string
          description?: string | null
          base_price?: number | null
          compare_at_price?: number | null
          status?: string | null
          gender?: string | null
          product_type?: string | null
          vendor?: string | null
          tags?: string[] | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          handle?: string
          description?: string | null
          base_price?: number | null
          compare_at_price?: number | null
          status?: string | null
          gender?: string | null
          product_type?: string | null
          vendor?: string | null
          tags?: string[] | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
          created_by?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          option1_name: string | null
          option1_value: string | null
          option2_name: string | null
          option2_value: string | null
          option3_name: string | null
          option3_value: string | null
          price: number | null
          compare_at_price: number | null
          sku: string | null
          barcode: string | null
          inventory_quantity: number | null
          weight: number | null
          weight_unit: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          option3_name?: string | null
          option3_value?: string | null
          price?: number | null
          compare_at_price?: number | null
          sku?: string | null
          barcode?: string | null
          inventory_quantity?: number | null
          weight?: number | null
          weight_unit?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          option3_name?: string | null
          option3_value?: string | null
          price?: number | null
          compare_at_price?: number | null
          sku?: string | null
          barcode?: string | null
          inventory_quantity?: number | null
          weight?: number | null
          weight_unit?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          url: string
          alt_text: string | null
          position: number
          created_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          url: string
          alt_text?: string | null
          position?: number
          created_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          url?: string
          alt_text?: string | null
          position?: number
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          id: string
          title: string
          handle: string
          description: string | null
          image_url: string | null
          published: boolean | null
          created_at: string | null
          updated_at: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          handle: string
          description?: string | null
          image_url?: string | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          handle?: string
          description?: string | null
          image_url?: string | null
          published?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          deleted_at?: string | null
        }
        Relationships: []
      }
      collection_products: {
        Row: {
          collection_id: string
          product_id: string
          position: number
        }
        Insert: {
          collection_id: string
          product_id: string
          position: number
        }
        Update: {
          collection_id?: string
          product_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          id: string
          variant_id: string
          quantity_change: number
          previous_quantity: number
          new_quantity: number
          movement_type: string | null
          notes: string | null
          created_at: string | null
          created_by: string | null
        }
        Insert: {
          id?: string
          variant_id: string
          quantity_change: number
          previous_quantity: number
          new_quantity: number
          movement_type?: string | null
          notes?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Update: {
          id?: string
          variant_id?: string
          quantity_change?: number
          previous_quantity?: number
          new_quantity?: number
          movement_type?: string | null
          notes?: string | null
          created_at?: string | null
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          last_name: string | null
          location: string | null
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          phone_number: string | null
          email_notifications: boolean | null
          sms_notifications: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          location?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          phone_number?: string | null
          email_notifications?: boolean | null
          sms_notifications?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          location?: string | null
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          phone_number?: string | null
          email_notifications?: boolean | null
          sms_notifications?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          id: string
          message: string
          message_type: string | null
          phone_number: string
          sent_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          message: string
          message_type?: string | null
          phone_number: string
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          message?: string
          message_type?: string | null
          phone_number?: string
          sent_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          converted_at: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          id: string
          intent: string | null
          invited_at: string | null
          last_name: string | null
          location: string | null
          phone_number: string
          priority_score: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          intent?: string | null
          invited_at?: string | null
          last_name?: string | null
          location?: string | null
          phone_number: string
          priority_score?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          intent?: string | null
          invited_at?: string | null
          last_name?: string | null
          location?: string | null
          phone_number?: string
          priority_score?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_tier: "monthly" | "quarterly" | "annual"
      user_role: "public" | "waitlist" | "inner_circle" | "staff" | "manager" | "admin"
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
    Enums: {
      subscription_tier: ["monthly", "quarterly", "annual"],
      user_role: ["public", "waitlist", "inner_circle", "staff", "manager", "admin"],
    },
  },
} as const
