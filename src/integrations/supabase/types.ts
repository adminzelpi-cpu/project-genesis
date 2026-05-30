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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          cart_id: string | null
          created_at: string
          email: string | null
          id: string
          items: Json
          last_reminder_at: string | null
          name: string | null
          phone: string | null
          recovered_at: string | null
          recovery_token: string | null
          reminders_sent: number
          subtotal: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cart_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          items?: Json
          last_reminder_at?: string | null
          name?: string | null
          phone?: string | null
          recovered_at?: string | null
          recovery_token?: string | null
          reminders_sent?: number
          subtotal?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cart_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          items?: Json
          last_reminder_at?: string | null
          name?: string | null
          phone?: string | null
          recovered_at?: string | null
          recovery_token?: string | null
          reminders_sent?: number
          subtotal?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          bairro: string | null
          cep: string
          cidade: string
          complemento: string | null
          created_at: string
          id: string
          is_default: boolean
          logradouro: string
          numero: string | null
          recipient_name: string | null
          reference: string | null
          uf: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bairro?: string | null
          cep: string
          cidade: string
          complemento?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          logradouro: string
          numero?: string | null
          recipient_name?: string | null
          reference?: string | null
          uf: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string
          cidade?: string
          complemento?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          logradouro?: string
          numero?: string | null
          recipient_name?: string | null
          reference?: string | null
          uf?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string
          color_hex: string | null
          created_at: string
          id: string
          image_url: string | null
          position: number
          size_category: string | null
          updated_at: string
          value: string
          value_code: number | null
        }
        Insert: {
          attribute_id: string
          color_hex?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          position?: number
          size_category?: string | null
          updated_at?: string
          value: string
          value_code?: number | null
        }
        Update: {
          attribute_id?: string
          color_hex?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          position?: number
          size_category?: string | null
          updated_at?: string
          value?: string
          value_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          created_at: string
          ends_at: string | null
          id: string
          image_mobile_url: string | null
          image_url: string
          link_url: string | null
          placement: string
          position: number
          starts_at: string | null
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          image_mobile_url?: string | null
          image_url: string
          link_url?: string | null
          placement?: string
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          ends_at?: string | null
          id?: string
          image_mobile_url?: string | null
          image_url?: string
          link_url?: string | null
          placement?: string
          position?: number
          starts_at?: string | null
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          unit_price: number
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          unit_price: number
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          coupon_code: string | null
          created_at: string
          discount: number
          id: string
          meta: Json
          session_id: string | null
          shipping: number
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          meta?: Json
          session_id?: string | null
          shipping?: number
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          coupon_code?: string | null
          created_at?: string
          discount?: number
          id?: string
          meta?: Json
          session_id?: string | null
          shipping?: number
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          og_image_url: string | null
          parent_id: string | null
          position: number
          published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          og_image_url?: string | null
          parent_id?: string | null
          position?: number
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          og_image_url?: string | null
          parent_id?: string | null
          position?: number
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_size_guides: {
        Row: {
          category_id: string
          size_guide_id: string
        }
        Insert: {
          category_id: string
          size_guide_id: string
        }
        Update: {
          category_id?: string
          size_guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_size_guides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_size_guides_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          og_image_url: string | null
          position: number
          published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          og_image_url?: string | null
          position?: number
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          og_image_url?: string | null
          position?: number
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          meta: Json
          name: string
          phone: string | null
          status: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          meta?: Json
          name: string
          phone?: string | null
          status?: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          meta?: Json
          name?: string
          phone?: string | null
          status?: string
          subject?: string | null
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          amount: number
          coupon_id: string
          created_at: string
          id: string
          order_id: string
          user_id: string | null
        }
        Insert: {
          amount: number
          coupon_id: string
          created_at?: string
          id?: string
          order_id: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          coupon_id?: string
          created_at?: string
          id?: string
          order_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          ends_at: string | null
          id: string
          min_subtotal: number | null
          per_user_limit: number | null
          starts_at: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          min_subtotal?: number | null
          per_user_limit?: number | null
          starts_at?: string | null
          type: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          min_subtotal?: number | null
          per_user_limit?: number | null
          starts_at?: string | null
          type?: Database["public"]["Enums"]["coupon_type"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          html_body: string
          id: string
          is_active: boolean
          name: string
          slug: string
          subject: string
          text_body: string | null
          updated_at: string
          variables: Json
        }
        Insert: {
          created_at?: string
          html_body: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          subject: string
          text_body?: string | null
          updated_at?: string
          variables?: Json
        }
        Update: {
          created_at?: string
          html_body?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          subject?: string
          text_body?: string | null
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      home_sections: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          position: number
          subtitle: string | null
          title: string | null
          type: Database["public"]["Enums"]["home_section_type"]
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          subtitle?: string | null
          title?: string | null
          type: Database["public"]["Enums"]["home_section_type"]
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          subtitle?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["home_section_type"]
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          id: string
          label: string
          menu_id: string
          open_new_tab: boolean
          parent_id: string | null
          position: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          menu_id: string
          open_new_tab?: boolean
          parent_id?: string | null
          position?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          menu_id?: string
          open_new_tab?: boolean
          parent_id?: string | null
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menus: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          status?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string | null
          order_id: string
          payload: Json | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          order_id: string
          payload?: Json | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string | null
          order_id?: string
          payload?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          order_id: string
          product_id: string | null
          quantity: number
          sku: string | null
          total: number
          unit_price: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          order_id: string
          product_id?: string | null
          quantity: number
          sku?: string | null
          total: number
          unit_price: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          sku?: string | null
          total?: number
          unit_price?: number
          variant_id?: string | null
          variant_label?: string | null
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
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          canceled_at: string | null
          coupon_code: string | null
          created_at: string
          delivered_at: string | null
          discount: number
          estimated_days: number | null
          guest_email: string | null
          id: string
          meta: Json
          mp_payment_id: string | null
          mp_preference_id: string | null
          notes: string | null
          number: string
          paid_at: string | null
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_address: Json | null
          shipping_carrier: string | null
          shipping_cost: number
          shipping_method: string | null
          shipping_service: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          tracking_code: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          canceled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          delivered_at?: string | null
          discount?: number
          estimated_days?: number | null
          guest_email?: string | null
          id?: string
          meta?: Json
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          number?: string
          paid_at?: string | null
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_cost?: number
          shipping_method?: string | null
          shipping_service?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          canceled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          delivered_at?: string | null
          discount?: number
          estimated_days?: number | null
          guest_email?: string | null
          id?: string
          meta?: Json
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          number?: string
          paid_at?: string | null
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_carrier?: string | null
          shipping_cost?: number
          shipping_method?: string | null
          shipping_service?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          tracking_code?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          og_image_url: string | null
          published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          og_image_url?: string | null
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          og_image_url?: string | null
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          collection_id: string
          position: number
          product_id: string
        }
        Insert: {
          collection_id: string
          position?: number
          product_id: string
        }
        Update: {
          collection_id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          url?: string
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
      product_size_guides: {
        Row: {
          product_id: string
          size_guide_id: string
        }
        Insert: {
          product_id: string
          size_guide_id: string
        }
        Update: {
          product_id?: string
          size_guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_size_guides_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_size_guides_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string
          id: string
          image_url: string | null
          option1_name: string | null
          option1_value: string | null
          option2_name: string | null
          option2_value: string | null
          option3_name: string | null
          option3_value: string | null
          position: number
          price: number | null
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          option3_name?: string | null
          option3_value?: string | null
          position?: number
          price?: number | null
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          option1_name?: string | null
          option1_value?: string | null
          option2_name?: string | null
          option2_value?: string | null
          option3_name?: string | null
          option3_value?: string | null
          position?: number
          price?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
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
      product_variations_v2: {
        Row: {
          attributes: Json
          barcode: string | null
          compare_at_price: number | null
          cost: number | null
          created_at: string
          height_cm: number | null
          id: string
          image_url: string | null
          images: Json
          is_active: boolean
          length_cm: number | null
          position: number
          price: number | null
          product_id: string
          sku: string | null
          stock: number
          updated_at: string
          weight_g: number | null
          width_cm: number | null
        }
        Insert: {
          attributes?: Json
          barcode?: string | null
          compare_at_price?: number | null
          cost?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          image_url?: string | null
          images?: Json
          is_active?: boolean
          length_cm?: number | null
          position?: number
          price?: number | null
          product_id: string
          sku?: string | null
          stock?: number
          updated_at?: string
          weight_g?: number | null
          width_cm?: number | null
        }
        Update: {
          attributes?: Json
          barcode?: string | null
          compare_at_price?: number | null
          cost?: number | null
          created_at?: string
          height_cm?: number | null
          id?: string
          image_url?: string | null
          images?: Json
          is_active?: boolean
          length_cm?: number | null
          position?: number
          price?: number | null
          product_id?: string
          sku?: string | null
          stock?: number
          updated_at?: string
          weight_g?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_v2_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          barcode: string | null
          brand: string | null
          compare_at_price: number | null
          cost: number | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          height_cm: number | null
          id: string
          length_cm: number | null
          name: string
          og_image_url: string | null
          price: number
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock: number
          track_inventory: boolean
          updated_at: string
          weight_g: number | null
          width_cm: number | null
        }
        Insert: {
          attributes?: Json
          barcode?: string | null
          brand?: string | null
          compare_at_price?: number | null
          cost?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          name: string
          og_image_url?: string | null
          price?: number
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          track_inventory?: boolean
          updated_at?: string
          weight_g?: number | null
          width_cm?: number | null
        }
        Update: {
          attributes?: Json
          barcode?: string | null
          brand?: string | null
          compare_at_price?: number | null
          cost?: number | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          name?: string
          og_image_url?: string | null
          price?: number
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock?: number
          track_inventory?: boolean
          updated_at?: string
          weight_g?: number | null
          width_cm?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          id: string
          product_id: string
          session_id: string | null
          user_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          active: boolean
          created_at: string
          from_path: string
          id: string
          notes: string | null
          status: number
          to_path: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          from_path: string
          id?: string
          notes?: string | null
          status?: number
          to_path: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          from_path?: string
          id?: string
          notes?: string | null
          status?: number
          to_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          id: string
          product_id: string
          rating: number
          status: Database["public"]["Enums"]["review_status"]
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          product_id: string
          rating: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          status?: Database["public"]["Enums"]["review_status"]
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_quotes_cache: {
        Row: {
          cep: string
          created_at: string
          expires_at: string
          id: string
          payload: Json
          weight_g: number
        }
        Insert: {
          cep: string
          created_at?: string
          expires_at: string
          id?: string
          payload: Json
          weight_g: number
        }
        Update: {
          cep?: string
          created_at?: string
          expires_at?: string
          id?: string
          payload?: Json
          weight_g?: number
        }
        Relationships: []
      }
      size_guides: {
        Row: {
          content: string | null
          created_at: string
          id: string
          published: boolean
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          published?: boolean
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_policies: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_published: boolean
          policy_type: string
          position: number
          seo_description: string | null
          seo_title: string | null
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          policy_type: string
          position?: number
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          policy_type?: string
          position?: number
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          analytics: Json
          announcement_bar: Json
          contact_address: Json | null
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          created_at: string
          description: string | null
          favicon_url: string | null
          id: number
          installment_config: Json
          integrations: Json
          legal_name: string | null
          logo_dark_url: string | null
          logo_url: string | null
          name: string
          og_default_image_url: string | null
          payment_config: Json
          seo_config: Json
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          shipping_config: Json
          shipping_origin: Json
          social: Json
          tagline: string | null
          theme: Json
          tracking_config: Json
          updated_at: string
        }
        Insert: {
          analytics?: Json
          announcement_bar?: Json
          contact_address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          description?: string | null
          favicon_url?: string | null
          id?: number
          installment_config?: Json
          integrations?: Json
          legal_name?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          og_default_image_url?: string | null
          payment_config?: Json
          seo_config?: Json
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          shipping_config?: Json
          shipping_origin?: Json
          social?: Json
          tagline?: string | null
          theme?: Json
          tracking_config?: Json
          updated_at?: string
        }
        Update: {
          analytics?: Json
          announcement_bar?: Json
          contact_address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          description?: string | null
          favicon_url?: string | null
          id?: number
          installment_config?: Json
          integrations?: Json
          legal_name?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          og_default_image_url?: string | null
          payment_config?: Json
          seo_config?: Json
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          shipping_config?: Json
          shipping_origin?: Json
          social?: Json
          tagline?: string | null
          theme?: Json
          tracking_config?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          payload: Json
          referrer: string | null
          session_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          payload?: Json
          referrer?: string | null
          session_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          payload?: Json
          referrer?: string | null
          session_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      store_settings_public: {
        Row: {
          analytics: Json | null
          contact_address: Json | null
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          description: string | null
          favicon_url: string | null
          id: number | null
          legal_name: string | null
          logo_dark_url: string | null
          logo_url: string | null
          name: string | null
          og_default_image_url: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          social: Json | null
          tagline: string | null
          theme: Json | null
        }
        Insert: {
          analytics?: Json | null
          contact_address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          description?: string | null
          favicon_url?: string | null
          id?: number | null
          legal_name?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string | null
          og_default_image_url?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          social?: Json | null
          tagline?: string | null
          theme?: Json | null
        }
        Update: {
          analytics?: Json | null
          contact_address?: Json | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          description?: string | null
          favicon_url?: string | null
          id?: number | null
          legal_name?: string | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string | null
          og_default_image_url?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          social?: Json | null
          tagline?: string | null
          theme?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      coupon_type: "percent" | "fixed" | "free_shipping"
      home_section_type:
        | "banner_carousel"
        | "categories_grid"
        | "featured_products"
        | "featured_collections"
        | "text_block"
        | "image_block"
        | "newsletter"
        | "instagram_feed"
        | "html_block"
      order_status:
        | "pending"
        | "awaiting_payment"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "canceled"
        | "refunded"
      payment_status:
        | "pending"
        | "approved"
        | "authorized"
        | "in_process"
        | "rejected"
        | "refunded"
        | "cancelled"
        | "charged_back"
      product_status: "draft" | "published" | "archived"
      review_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "customer"],
      coupon_type: ["percent", "fixed", "free_shipping"],
      home_section_type: [
        "banner_carousel",
        "categories_grid",
        "featured_products",
        "featured_collections",
        "text_block",
        "image_block",
        "newsletter",
        "instagram_feed",
        "html_block",
      ],
      order_status: [
        "pending",
        "awaiting_payment",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "canceled",
        "refunded",
      ],
      payment_status: [
        "pending",
        "approved",
        "authorized",
        "in_process",
        "rejected",
        "refunded",
        "cancelled",
        "charged_back",
      ],
      product_status: ["draft", "published", "archived"],
      review_status: ["pending", "approved", "rejected"],
    },
  },
} as const
