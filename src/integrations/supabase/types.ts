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
          abandoned_at: string
          cart_items: Json
          cart_total: number
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          emails_sent: number
          id: string
          last_email_sent_at: string | null
          order_id: string | null
          recovered_at: string | null
          recovery_token: string
          store_id: string
          updated_at: string
        }
        Insert: {
          abandoned_at?: string
          cart_items?: Json
          cart_total?: number
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          emails_sent?: number
          id?: string
          last_email_sent_at?: string | null
          order_id?: string | null
          recovered_at?: string | null
          recovery_token?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          abandoned_at?: string
          cart_items?: Json
          cart_total?: number
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          emails_sent?: number
          id?: string
          last_email_sent_at?: string | null
          order_id?: string | null
          recovered_at?: string | null
          recovery_token?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_default: boolean | null
          label: string
          neighborhood: string
          number: string
          recipient_name: string
          state: string
          street: string
          updated_at: string | null
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          neighborhood: string
          number: string
          recipient_name: string
          state: string
          street: string
          updated_at?: string | null
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          neighborhood?: string
          number?: string
          recipient_name?: string
          state?: string
          street?: string
          updated_at?: string | null
          user_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      attribute_values: {
        Row: {
          attribute_id: string
          color_hex: string | null
          created_at: string
          id: string
          size_category: string | null
          value: string
          value_code: number | null
        }
        Insert: {
          attribute_id: string
          color_hex?: string | null
          created_at?: string
          id?: string
          size_category?: string | null
          value: string
          value_code?: number | null
        }
        Update: {
          attribute_id?: string
          color_hex?: string | null
          created_at?: string
          id?: string
          size_category?: string | null
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
          store_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          store_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          store_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attributes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_analytics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          store_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          store_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          messages: Json
          session_id: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          messages?: Json
          session_id: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          messages?: Json
          session_id?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount_value: number | null
          min_order_value: number | null
          starts_at: string | null
          store_id: string
          updated_at: string
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_value?: number | null
          min_order_value?: number | null
          starts_at?: string | null
          store_id: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount_value?: number | null
          min_order_value?: number | null
          starts_at?: string | null
          store_id?: string
          updated_at?: string
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_domains: {
        Row: {
          cloudflare_hostname_id: string | null
          cloudflare_www_hostname_id: string | null
          created_at: string
          domain: string
          id: string
          is_primary: boolean
          is_verified: boolean
          store_id: string
          updated_at: string
        }
        Insert: {
          cloudflare_hostname_id?: string | null
          cloudflare_www_hostname_id?: string | null
          created_at?: string
          domain: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          store_id: string
          updated_at?: string
        }
        Update: {
          cloudflare_hostname_id?: string | null
          cloudflare_www_hostname_id?: string | null
          created_at?: string
          domain?: string
          id?: string
          is_primary?: boolean
          is_verified?: boolean
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activity_log: {
        Row: {
          activity_data: Json | null
          activity_type: string
          created_at: string
          customer_id: string | null
          id: string
          session_id: string | null
          store_id: string
          user_auth_id: string | null
        }
        Insert: {
          activity_data?: Json | null
          activity_type: string
          created_at?: string
          customer_id?: string | null
          id?: string
          session_id?: string | null
          store_id: string
          user_auth_id?: string | null
        }
        Update: {
          activity_data?: Json | null
          activity_type?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          session_id?: string | null
          store_id?: string
          user_auth_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_log_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          complemento: string | null
          created_at: string
          customer_id: string
          estado: string
          id: string
          is_default: boolean | null
          numero: string
          rua: string
          tipo: string
          updated_at: string
        }
        Insert: {
          bairro: string
          cep: string
          cidade: string
          complemento?: string | null
          created_at?: string
          customer_id: string
          estado: string
          id?: string
          is_default?: boolean | null
          numero: string
          rua: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          complemento?: string | null
          created_at?: string
          customer_id?: string
          estado?: string
          id?: string
          is_default?: boolean | null
          numero?: string
          rua?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notifications: {
        Row: {
          created_at: string
          customer_id: string | null
          description: string | null
          id: string
          is_read: boolean
          metadata: Json | null
          order_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          order_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          description?: string | null
          id?: string
          is_read?: boolean
          metadata?: Json | null
          order_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_preferences: {
        Row: {
          confidence: number | null
          created_at: string
          customer_id: string
          id: string
          preference_key: string
          preference_type: string
          preference_value: string
          source: string
          store_id: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          customer_id: string
          id?: string
          preference_key: string
          preference_type: string
          preference_value: string
          source?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          customer_id?: string
          id?: string
          preference_key?: string
          preference_type?: string
          preference_value?: string
          source?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_preferences_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_preferences_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          auth_user_id: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          email_verified: boolean
          id: string
          last_login_at: string | null
          magic_link_token: string | null
          magic_link_token_expires_at: string | null
          needs_password_setup: boolean | null
          nome: string
          password_hash: string | null
          password_reset_token: string | null
          password_reset_token_expires_at: string | null
          password_setup_token: string | null
          password_setup_token_expires_at: string | null
          platform_user_id: string
          store_id: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          last_login_at?: string | null
          magic_link_token?: string | null
          magic_link_token_expires_at?: string | null
          needs_password_setup?: boolean | null
          nome: string
          password_hash?: string | null
          password_reset_token?: string | null
          password_reset_token_expires_at?: string | null
          password_setup_token?: string | null
          password_setup_token_expires_at?: string | null
          platform_user_id?: string
          store_id: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          email_verified?: boolean
          id?: string
          last_login_at?: string | null
          magic_link_token?: string | null
          magic_link_token_expires_at?: string | null
          needs_password_setup?: boolean | null
          nome?: string
          password_hash?: string | null
          password_reset_token?: string | null
          password_reset_token_expires_at?: string | null
          password_setup_token?: string | null
          password_setup_token_expires_at?: string | null
          platform_user_id?: string
          store_id?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          abandoned_cart_id: string | null
          clicked_at: string | null
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          opened_at: string | null
          order_id: string | null
          recipient_email: string
          recipient_name: string | null
          resend_id: string | null
          sent_at: string | null
          status: string
          store_id: string
          subject: string
          tracking_id: string | null
        }
        Insert: {
          abandoned_cart_id?: string | null
          clicked_at?: string | null
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          order_id?: string | null
          recipient_email: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          store_id: string
          subject: string
          tracking_id?: string | null
        }
        Update: {
          abandoned_cart_id?: string | null
          clicked_at?: string | null
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          order_id?: string | null
          recipient_email?: string
          recipient_name?: string | null
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          store_id?: string
          subject?: string
          tracking_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_abandoned_cart_id_fkey"
            columns: ["abandoned_cart_id"]
            isOneToOne: false
            referencedRelation: "abandoned_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          category: Database["public"]["Enums"]["error_category"]
          context: Json | null
          created_at: string | null
          id: string
          message: string
          resolved: boolean | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["error_severity"]
          stack_trace: string | null
          store_id: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["error_category"]
          context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["error_severity"]
          stack_trace?: string | null
          store_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["error_category"]
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          resolved?: boolean | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["error_severity"]
          stack_trace?: string | null
          store_id?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          algorithm: string
          created_at: string
          experiment_type: string
          id: string
          name: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          experiment_type: string
          id?: string
          name: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          experiment_type?: string
          id?: string
          name?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          color_value_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          product_id: string
          user_id: string | null
        }
        Insert: {
          color_value_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          product_id: string
          user_id?: string | null
        }
        Update: {
          color_value_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          product_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_access_logs: {
        Row: {
          accessed_at: string
          feed_config_id: string | null
          id: string
          ip_address: string | null
          platform: string
          store_id: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          feed_config_id?: string | null
          id?: string
          ip_address?: string | null
          platform: string
          store_id: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          feed_config_id?: string | null
          id?: string
          ip_address?: string | null
          platform?: string
          store_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_access_logs_feed_config_id_fkey"
            columns: ["feed_config_id"]
            isOneToOne: false
            referencedRelation: "feed_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_access_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_configurations: {
        Row: {
          access_count: number | null
          created_at: string
          custom_settings: Json | null
          feed_url_slug: string | null
          id: string
          is_active: boolean
          last_accessed_at: string | null
          platform: string
          store_id: string
          updated_at: string
        }
        Insert: {
          access_count?: number | null
          created_at?: string
          custom_settings?: Json | null
          feed_url_slug?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          platform: string
          store_id: string
          updated_at?: string
        }
        Update: {
          access_count?: number | null
          created_at?: string
          custom_settings?: Json | null
          feed_url_slug?: string | null
          id?: string
          is_active?: boolean
          last_accessed_at?: string | null
          platform?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_configurations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_platform_templates: {
        Row: {
          created_at: string
          documentation_url: string | null
          id: string
          is_system: boolean | null
          optional_fields: Json | null
          platform_color: string
          platform_icon: string
          platform_name: string
          required_fields: Json
          updated_at: string
          xml_template: string
        }
        Insert: {
          created_at?: string
          documentation_url?: string | null
          id?: string
          is_system?: boolean | null
          optional_fields?: Json | null
          platform_color: string
          platform_icon: string
          platform_name: string
          required_fields?: Json
          updated_at?: string
          xml_template: string
        }
        Update: {
          created_at?: string
          documentation_url?: string | null
          id?: string
          is_system?: boolean | null
          optional_fields?: Json | null
          platform_color?: string
          platform_icon?: string
          platform_name?: string
          required_fields?: Json
          updated_at?: string
          xml_template?: string
        }
        Relationships: []
      }
      health_checks: {
        Row: {
          check_type: string
          created_at: string | null
          details: Json | null
          id: string
          response_time_ms: number | null
          status: string
          store_id: string | null
        }
        Insert: {
          check_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          response_time_ms?: number | null
          status: string
          store_id?: string | null
        }
        Update: {
          check_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          response_time_ms?: number | null
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          authorized_at: string | null
          cancelled_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          nfe_key: string | null
          nfe_number: string | null
          nfe_protocol: string | null
          nfe_serie: string | null
          order_id: string
          pdf_url: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
          store_id: string
          total_value: number
          updated_at: string
          xml_url: string | null
        }
        Insert: {
          authorized_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          nfe_key?: string | null
          nfe_number?: string | null
          nfe_protocol?: string | null
          nfe_serie?: string | null
          order_id: string
          pdf_url?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          store_id: string
          total_value?: number
          updated_at?: string
          xml_url?: string | null
        }
        Update: {
          authorized_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          nfe_key?: string | null
          nfe_number?: string | null
          nfe_protocol?: string | null
          nfe_serie?: string | null
          order_id?: string
          pdf_url?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
          store_id?: string
          total_value?: number
          updated_at?: string
          xml_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_connections: {
        Row: {
          access_token: string
          available_ad_accounts: Json | null
          available_business_managers: Json | null
          available_catalogs: Json | null
          available_instagram_accounts: Json | null
          available_pages: Json | null
          available_pixels: Json | null
          configuration_status: string
          connected_at: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          meta_user_id: string
          meta_user_name: string | null
          scopes: string[] | null
          selected_ad_account: Json | null
          selected_ad_accounts: Json | null
          selected_business_manager: Json | null
          selected_catalog: Json | null
          selected_catalogs: Json | null
          selected_instagram_account: Json | null
          selected_page: Json | null
          selected_pages: Json | null
          selected_pixel: Json | null
          selected_pixels: Json | null
          store_id: string
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          available_ad_accounts?: Json | null
          available_business_managers?: Json | null
          available_catalogs?: Json | null
          available_instagram_accounts?: Json | null
          available_pages?: Json | null
          available_pixels?: Json | null
          configuration_status?: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meta_user_id: string
          meta_user_name?: string | null
          scopes?: string[] | null
          selected_ad_account?: Json | null
          selected_ad_accounts?: Json | null
          selected_business_manager?: Json | null
          selected_catalog?: Json | null
          selected_catalogs?: Json | null
          selected_instagram_account?: Json | null
          selected_page?: Json | null
          selected_pages?: Json | null
          selected_pixel?: Json | null
          selected_pixels?: Json | null
          store_id: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          available_ad_accounts?: Json | null
          available_business_managers?: Json | null
          available_catalogs?: Json | null
          available_instagram_accounts?: Json | null
          available_pages?: Json | null
          available_pixels?: Json | null
          configuration_status?: string
          connected_at?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          meta_user_id?: string
          meta_user_name?: string | null
          scopes?: string[] | null
          selected_ad_account?: Json | null
          selected_ad_accounts?: Json | null
          selected_business_manager?: Json | null
          selected_catalog?: Json | null
          selected_catalogs?: Json | null
          selected_instagram_account?: Json | null
          selected_page?: Json | null
          selected_pages?: Json | null
          selected_pixel?: Json | null
          selected_pixels?: Json | null
          store_id?: string
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_connections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          consented_at: string
          created_at: string
          email: string
          id: string
          name: string | null
          source: string
          status: string
          store_id: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          consented_at?: string
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source?: string
          status?: string
          store_id: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          consented_at?: string
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source?: string
          status?: string
          store_id?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "newsletter_subscribers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string | null
          desconto: number
          endereco_entrega: Json | null
          forma_pagamento: string | null
          frete: number
          id: string
          observacao_cliente: string | null
          order_number: number | null
          product_snapshots: Json | null
          products: Json
          purchase_event_id: string
          purchase_event_sent_at: string | null
          status_pagamento: string
          status_pedido: string
          stock_updated: boolean | null
          store_id: string
          subtotal: number
          total: number
          tracking_carrier: string | null
          tracking_code: string | null
          tracking_code_sent_at: string | null
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          desconto?: number
          endereco_entrega?: Json | null
          forma_pagamento?: string | null
          frete?: number
          id?: string
          observacao_cliente?: string | null
          order_number?: number | null
          product_snapshots?: Json | null
          products?: Json
          purchase_event_id?: string
          purchase_event_sent_at?: string | null
          status_pagamento?: string
          status_pedido?: string
          stock_updated?: boolean | null
          store_id: string
          subtotal?: number
          total?: number
          tracking_carrier?: string | null
          tracking_code?: string | null
          tracking_code_sent_at?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          desconto?: number
          endereco_entrega?: Json | null
          forma_pagamento?: string | null
          frete?: number
          id?: string
          observacao_cliente?: string | null
          order_number?: number | null
          product_snapshots?: Json | null
          products?: Json
          purchase_event_id?: string
          purchase_event_sent_at?: string | null
          status_pagamento?: string
          status_pedido?: string
          stock_updated?: boolean | null
          store_id?: string
          subtotal?: number
          total?: number
          tracking_carrier?: string | null
          tracking_code?: string | null
          tracking_code_sent_at?: string | null
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          card_brand: string
          card_last4: string
          created_at: string | null
          customer_id: string | null
          expiry_month: string
          expiry_year: string
          holder_name: string
          id: string
          is_default: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          card_brand: string
          card_last4: string
          created_at?: string | null
          customer_id?: string | null
          expiry_month: string
          expiry_year: string
          holder_name: string
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          card_brand?: string
          card_last4?: string
          created_at?: string | null
          customer_id?: string | null
          expiry_month?: string
          expiry_year?: string
          holder_name?: string
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          barcode: string | null
          barcode_url: string | null
          created_at: string
          currency: string
          expiration_date: string | null
          external_id: string | null
          external_reference: string | null
          gateway_response: Json | null
          gateway_type: string
          id: string
          installments: number | null
          order_id: string
          payer_document: string | null
          payer_email: string | null
          payment_method: string | null
          payment_type: string | null
          qr_code: string | null
          qr_code_base64: string | null
          refund_amount: number | null
          refund_external_id: string | null
          refund_response: Json | null
          refund_status: string | null
          refunded_at: string | null
          status: string
          status_detail: string | null
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          barcode?: string | null
          barcode_url?: string | null
          created_at?: string
          currency?: string
          expiration_date?: string | null
          external_id?: string | null
          external_reference?: string | null
          gateway_response?: Json | null
          gateway_type: string
          id?: string
          installments?: number | null
          order_id: string
          payer_document?: string | null
          payer_email?: string | null
          payment_method?: string | null
          payment_type?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          refund_amount?: number | null
          refund_external_id?: string | null
          refund_response?: Json | null
          refund_status?: string | null
          refunded_at?: string | null
          status?: string
          status_detail?: string | null
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          barcode?: string | null
          barcode_url?: string | null
          created_at?: string
          currency?: string
          expiration_date?: string | null
          external_id?: string | null
          external_reference?: string | null
          gateway_response?: Json | null
          gateway_type?: string
          id?: string
          installments?: number | null
          order_id?: string
          payer_document?: string | null
          payer_email?: string | null
          payment_method?: string | null
          payment_type?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          refund_amount?: number | null
          refund_external_id?: string | null
          refund_response?: Json | null
          refund_status?: string | null
          refunded_at?: string | null
          status?: string
          status_detail?: string | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string | null
          id: string
          metric_name: string
          metric_type: string
          store_id: string | null
          tags: Json | null
          unit: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_name: string
          metric_type: string
          store_id?: string | null
          tags?: Json | null
          unit?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_name?: string
          metric_type?: string
          store_id?: string | null
          tags?: Json | null
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          google_category: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          google_category?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          google_category?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          price_adjustment: number | null
          product_id: string
          stock_quantity: number | null
          type: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          price_adjustment?: number | null
          product_id: string
          stock_quantity?: number | null
          type: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          price_adjustment?: number | null
          product_id?: string
          stock_quantity?: number | null
          type?: string
          updated_at?: string
          value?: string
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
      product_variations: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          product_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_product_id_fkey"
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
          created_at: string
          ean: string | null
          gtin: string | null
          height: number | null
          id: string
          image_url: string | null
          images: Json | null
          is_active: boolean
          is_parent: boolean
          length: number | null
          mpn: string | null
          override_fields: Json
          parent_id: string | null
          price: number
          product_id: string
          sale_price: number | null
          sku: string | null
          stock_quantity: number | null
          upc: string | null
          updated_at: string
          weight: number | null
          width: number | null
        }
        Insert: {
          attributes?: Json
          created_at?: string
          ean?: string | null
          gtin?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          is_parent?: boolean
          length?: number | null
          mpn?: string | null
          override_fields?: Json
          parent_id?: string | null
          price?: number
          product_id: string
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          upc?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Update: {
          attributes?: Json
          created_at?: string
          ean?: string | null
          gtin?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          images?: Json | null
          is_active?: boolean
          is_parent?: boolean
          length?: number | null
          mpn?: string | null
          override_fields?: Json
          parent_id?: string | null
          price?: number
          product_id?: string
          sale_price?: number | null
          sku?: string | null
          stock_quantity?: number | null
          upc?: string | null
          updated_at?: string
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variations_v2_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_variations_v2"
            referencedColumns: ["id"]
          },
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
          age_group: string | null
          ai_generated_description: boolean | null
          barcode: string | null
          brand: string | null
          category: string | null
          category_id: string | null
          category_ids: string[] | null
          created_at: string
          description: string | null
          display_variations_separately: boolean
          gallery_layout: string | null
          gender: string | null
          height: number | null
          hide_parent_product: boolean | null
          id: string
          image_alt_tags: Json | null
          images: Json | null
          is_active: boolean
          keywords: string[] | null
          length: number | null
          material: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number
          product_code: number
          sale_price: number | null
          size_guide_id: string | null
          sku: string | null
          slug: string
          stock_quantity: number | null
          store_id: string
          structured_data: Json | null
          tags: string[] | null
          updated_at: string
          variant_selector_layout: string | null
          weight: number | null
          width: number | null
        }
        Insert: {
          age_group?: string | null
          ai_generated_description?: boolean | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          category_ids?: string[] | null
          created_at?: string
          description?: string | null
          display_variations_separately?: boolean
          gallery_layout?: string | null
          gender?: string | null
          height?: number | null
          hide_parent_product?: boolean | null
          id?: string
          image_alt_tags?: Json | null
          images?: Json | null
          is_active?: boolean
          keywords?: string[] | null
          length?: number | null
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price: number
          product_code?: number
          sale_price?: number | null
          size_guide_id?: string | null
          sku?: string | null
          slug: string
          stock_quantity?: number | null
          store_id: string
          structured_data?: Json | null
          tags?: string[] | null
          updated_at?: string
          variant_selector_layout?: string | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          age_group?: string | null
          ai_generated_description?: boolean | null
          barcode?: string | null
          brand?: string | null
          category?: string | null
          category_id?: string | null
          category_ids?: string[] | null
          created_at?: string
          description?: string | null
          display_variations_separately?: boolean
          gallery_layout?: string | null
          gender?: string | null
          height?: number | null
          hide_parent_product?: boolean | null
          id?: string
          image_alt_tags?: Json | null
          images?: Json | null
          is_active?: boolean
          keywords?: string[] | null
          length?: number | null
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          product_code?: number
          sale_price?: number | null
          size_guide_id?: string | null
          sku?: string | null
          slug?: string
          stock_quantity?: number | null
          store_id?: string
          structured_data?: Json | null
          tags?: string[] | null
          updated_at?: string
          variant_selector_layout?: string | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          cancel_if_payment_confirmed: boolean
          cancelled_reason: string | null
          created_at: string
          email_payload: Json
          email_type: string
          id: string
          order_id: string | null
          processed_at: string | null
          recipient_email: string
          recipient_name: string | null
          send_after: string
          status: string
          store_id: string
        }
        Insert: {
          cancel_if_payment_confirmed?: boolean
          cancelled_reason?: string | null
          created_at?: string
          email_payload?: Json
          email_type: string
          id?: string
          order_id?: string | null
          processed_at?: string | null
          recipient_email: string
          recipient_name?: string | null
          send_after: string
          status?: string
          store_id: string
        }
        Update: {
          cancel_if_payment_confirmed?: boolean
          cancelled_reason?: string | null
          created_at?: string
          email_payload?: Json
          email_type?: string
          id?: string
          order_id?: string | null
          processed_at?: string | null
          recipient_email?: string
          recipient_name?: string | null
          send_after?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_emails_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_emails_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      size_guide_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          size_guide_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          size_guide_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          size_guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_guide_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "size_guide_categories_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      size_guide_dimensions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          measurement_type: string | null
          name: string
          position: number | null
          size_guide_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          measurement_type?: string | null
          name: string
          position?: number | null
          size_guide_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          measurement_type?: string | null
          name?: string
          position?: number | null
          size_guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_guide_dimensions_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      size_guide_sizes: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number | null
          size_guide_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number | null
          size_guide_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number | null
          size_guide_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_guide_sizes_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
        ]
      }
      size_guide_values: {
        Row: {
          created_at: string
          dimension_id: string
          id: string
          size_guide_id: string
          size_id: string
          value: string
        }
        Insert: {
          created_at?: string
          dimension_id: string
          id?: string
          size_guide_id: string
          size_id: string
          value: string
        }
        Update: {
          created_at?: string
          dimension_id?: string
          id?: string
          size_guide_id?: string
          size_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_guide_values_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "size_guide_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "size_guide_values_size_guide_id_fkey"
            columns: ["size_guide_id"]
            isOneToOne: false
            referencedRelation: "size_guides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "size_guide_values_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "size_guide_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      size_guides: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          store_id: string
          template_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          store_id: string
          template_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          store_id?: string
          template_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "size_guides_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_announcements: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          link: string | null
          position: number
          store_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          link?: string | null
          position?: number
          store_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          link?: string | null
          position?: number
          store_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_announcements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_chat_settings: {
        Row: {
          assistant_name: string
          avatar_url: string | null
          created_at: string
          id: string
          is_enabled: boolean
          primary_color: string | null
          proactive_delay_seconds: number
          proactivity_level: string
          store_id: string
          tone: string
          updated_at: string
          welcome_message: string | null
          whatsapp_fallback: string | null
        }
        Insert: {
          assistant_name?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          primary_color?: string | null
          proactive_delay_seconds?: number
          proactivity_level?: string
          store_id: string
          tone?: string
          updated_at?: string
          welcome_message?: string | null
          whatsapp_fallback?: string | null
        }
        Update: {
          assistant_name?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          primary_color?: string | null
          proactive_delay_seconds?: number
          proactivity_level?: string
          store_id?: string
          tone?: string
          updated_at?: string
          welcome_message?: string | null
          whatsapp_fallback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_chat_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_email_settings: {
        Row: {
          abandoned_cart_body_1: string | null
          abandoned_cart_body_2: string | null
          abandoned_cart_body_3: string | null
          abandoned_cart_delay_1: number | null
          abandoned_cart_delay_2: number | null
          abandoned_cart_delay_3: number | null
          abandoned_cart_enabled: boolean | null
          abandoned_cart_enabled_1: boolean | null
          abandoned_cart_enabled_2: boolean | null
          abandoned_cart_enabled_3: boolean | null
          abandoned_cart_preheader_1: string | null
          abandoned_cart_preheader_2: string | null
          abandoned_cart_preheader_3: string | null
          abandoned_cart_subject_1: string | null
          abandoned_cart_subject_2: string | null
          abandoned_cart_subject_3: string | null
          boleto_generated_enabled: boolean
          created_at: string
          id: string
          invoice_generated_enabled: boolean | null
          order_cancelled_enabled: boolean
          order_confirmed_enabled: boolean
          order_delivered_enabled: boolean
          order_preparing_enabled: boolean
          order_shipped_enabled: boolean
          payment_confirmed_enabled: boolean
          payment_failed_enabled: boolean
          pix_expired_enabled: boolean
          pix_generated_enabled: boolean
          refund_processed_enabled: boolean | null
          reply_to_email: string | null
          sender_name: string | null
          set_password_enabled: boolean | null
          store_id: string
          tracking_code_auto_send_enabled: boolean | null
          tracking_code_enabled: boolean | null
          updated_at: string
          welcome_enabled: boolean | null
        }
        Insert: {
          abandoned_cart_body_1?: string | null
          abandoned_cart_body_2?: string | null
          abandoned_cart_body_3?: string | null
          abandoned_cart_delay_1?: number | null
          abandoned_cart_delay_2?: number | null
          abandoned_cart_delay_3?: number | null
          abandoned_cart_enabled?: boolean | null
          abandoned_cart_enabled_1?: boolean | null
          abandoned_cart_enabled_2?: boolean | null
          abandoned_cart_enabled_3?: boolean | null
          abandoned_cart_preheader_1?: string | null
          abandoned_cart_preheader_2?: string | null
          abandoned_cart_preheader_3?: string | null
          abandoned_cart_subject_1?: string | null
          abandoned_cart_subject_2?: string | null
          abandoned_cart_subject_3?: string | null
          boleto_generated_enabled?: boolean
          created_at?: string
          id?: string
          invoice_generated_enabled?: boolean | null
          order_cancelled_enabled?: boolean
          order_confirmed_enabled?: boolean
          order_delivered_enabled?: boolean
          order_preparing_enabled?: boolean
          order_shipped_enabled?: boolean
          payment_confirmed_enabled?: boolean
          payment_failed_enabled?: boolean
          pix_expired_enabled?: boolean
          pix_generated_enabled?: boolean
          refund_processed_enabled?: boolean | null
          reply_to_email?: string | null
          sender_name?: string | null
          set_password_enabled?: boolean | null
          store_id: string
          tracking_code_auto_send_enabled?: boolean | null
          tracking_code_enabled?: boolean | null
          updated_at?: string
          welcome_enabled?: boolean | null
        }
        Update: {
          abandoned_cart_body_1?: string | null
          abandoned_cart_body_2?: string | null
          abandoned_cart_body_3?: string | null
          abandoned_cart_delay_1?: number | null
          abandoned_cart_delay_2?: number | null
          abandoned_cart_delay_3?: number | null
          abandoned_cart_enabled?: boolean | null
          abandoned_cart_enabled_1?: boolean | null
          abandoned_cart_enabled_2?: boolean | null
          abandoned_cart_enabled_3?: boolean | null
          abandoned_cart_preheader_1?: string | null
          abandoned_cart_preheader_2?: string | null
          abandoned_cart_preheader_3?: string | null
          abandoned_cart_subject_1?: string | null
          abandoned_cart_subject_2?: string | null
          abandoned_cart_subject_3?: string | null
          boleto_generated_enabled?: boolean
          created_at?: string
          id?: string
          invoice_generated_enabled?: boolean | null
          order_cancelled_enabled?: boolean
          order_confirmed_enabled?: boolean
          order_delivered_enabled?: boolean
          order_preparing_enabled?: boolean
          order_shipped_enabled?: boolean
          payment_confirmed_enabled?: boolean
          payment_failed_enabled?: boolean
          pix_expired_enabled?: boolean
          pix_generated_enabled?: boolean
          refund_processed_enabled?: boolean | null
          reply_to_email?: string | null
          sender_name?: string | null
          set_password_enabled?: boolean | null
          store_id?: string
          tracking_code_auto_send_enabled?: boolean | null
          tracking_code_enabled?: boolean | null
          updated_at?: string
          welcome_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "store_email_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_email_templates: {
        Row: {
          body: string | null
          created_at: string
          cta_text: string | null
          cta_url: string | null
          email_type: string
          id: string
          include_order_summary: boolean
          preheader: string | null
          store_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          email_type: string
          id?: string
          include_order_summary?: boolean
          preheader?: string | null
          store_id: string
          subject: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          email_type?: string
          id?: string
          include_order_summary?: boolean
          preheader?: string | null
          store_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_email_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_fiscal_config: {
        Row: {
          auto_emit_on_payment: boolean
          cfop: string | null
          cnpj: string | null
          created_at: string
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_codigo_municipio: string | null
          endereco_complemento: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          endereco_uf: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          is_configured: boolean
          natureza_operacao: string | null
          ncm_padrao: string | null
          nome_fantasia: string | null
          razao_social: string | null
          regime_tributario: string | null
          serie_nfe: number | null
          store_id: string
          updated_at: string
        }
        Insert: {
          auto_emit_on_payment?: boolean
          cfop?: string | null
          cnpj?: string | null
          created_at?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_codigo_municipio?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_configured?: boolean
          natureza_operacao?: string | null
          ncm_padrao?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          serie_nfe?: number | null
          store_id: string
          updated_at?: string
        }
        Update: {
          auto_emit_on_payment?: boolean
          cfop?: string | null
          cnpj?: string | null
          created_at?: string
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_codigo_municipio?: string | null
          endereco_complemento?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          endereco_uf?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          is_configured?: boolean
          natureza_operacao?: string | null
          ncm_padrao?: string | null
          nome_fantasia?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          serie_nfe?: number | null
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_fiscal_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_home_banners: {
        Row: {
          button_bg_color: string | null
          button_border_color: string | null
          button_link: string | null
          button_style: string | null
          button_text: string | null
          button_text_color: string | null
          created_at: string
          id: string
          image_url: string
          image_url_mobile: string | null
          is_active: boolean
          position: number
          section_id: string
          subtitle: string | null
          subtitle_color: string | null
          text_position: string | null
          title: string | null
          title_color: string | null
          updated_at: string
        }
        Insert: {
          button_bg_color?: string | null
          button_border_color?: string | null
          button_link?: string | null
          button_style?: string | null
          button_text?: string | null
          button_text_color?: string | null
          created_at?: string
          id?: string
          image_url: string
          image_url_mobile?: string | null
          is_active?: boolean
          position?: number
          section_id: string
          subtitle?: string | null
          subtitle_color?: string | null
          text_position?: string | null
          title?: string | null
          title_color?: string | null
          updated_at?: string
        }
        Update: {
          button_bg_color?: string | null
          button_border_color?: string | null
          button_link?: string | null
          button_style?: string | null
          button_text?: string | null
          button_text_color?: string | null
          created_at?: string
          id?: string
          image_url?: string
          image_url_mobile?: string | null
          is_active?: boolean
          position?: number
          section_id?: string
          subtitle?: string | null
          subtitle_color?: string | null
          text_position?: string | null
          title?: string | null
          title_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_home_banners_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "store_home_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      store_home_items: {
        Row: {
          button_bg_color: string | null
          button_border_color: string | null
          button_style: string | null
          button_text_color: string | null
          color_value_id: string | null
          created_at: string
          custom_button_link: string | null
          custom_button_text: string | null
          custom_image_url: string | null
          custom_subtitle: string | null
          custom_title: string | null
          id: string
          is_active: boolean
          item_id: string
          item_type: string
          position: number
          section_id: string
          subtitle_color: string | null
          title_color: string | null
          updated_at: string
        }
        Insert: {
          button_bg_color?: string | null
          button_border_color?: string | null
          button_style?: string | null
          button_text_color?: string | null
          color_value_id?: string | null
          created_at?: string
          custom_button_link?: string | null
          custom_button_text?: string | null
          custom_image_url?: string | null
          custom_subtitle?: string | null
          custom_title?: string | null
          id?: string
          is_active?: boolean
          item_id: string
          item_type: string
          position?: number
          section_id: string
          subtitle_color?: string | null
          title_color?: string | null
          updated_at?: string
        }
        Update: {
          button_bg_color?: string | null
          button_border_color?: string | null
          button_style?: string | null
          button_text_color?: string | null
          color_value_id?: string | null
          created_at?: string
          custom_button_link?: string | null
          custom_button_text?: string | null
          custom_image_url?: string | null
          custom_subtitle?: string | null
          custom_title?: string | null
          id?: string
          is_active?: boolean
          item_id?: string
          item_type?: string
          position?: number
          section_id?: string
          subtitle_color?: string | null
          title_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_home_items_color_value_id_fkey"
            columns: ["color_value_id"]
            isOneToOne: false
            referencedRelation: "attribute_values"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_home_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "store_home_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      store_home_sections: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          position: number
          section_type: string
          settings: Json | null
          store_id: string
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          section_type: string
          settings?: Json | null
          store_id: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          position?: number
          section_type?: string
          settings?: Json | null
          store_id?: string
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_home_sections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_lgpd_settings: {
        Row: {
          accept_button_text: string
          created_at: string
          description: string
          id: string
          is_enabled: boolean
          privacy_policy_url: string | null
          reject_button_text: string
          store_id: string
          style_variant: string
          title: string
          updated_at: string
        }
        Insert: {
          accept_button_text?: string
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          privacy_policy_url?: string | null
          reject_button_text?: string
          store_id: string
          style_variant?: string
          title?: string
          updated_at?: string
        }
        Update: {
          accept_button_text?: string
          created_at?: string
          description?: string
          id?: string
          is_enabled?: boolean
          privacy_policy_url?: string | null
          reject_button_text?: string
          store_id?: string
          style_variant?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_lgpd_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_media: {
        Row: {
          alt_text: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          folder: string | null
          height: number | null
          id: string
          mime_type: string | null
          original_name: string | null
          store_id: string
          tags: string[] | null
          updated_at: string
          used_in_products: number | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_name?: string | null
          store_id: string
          tags?: string[] | null
          updated_at?: string
          used_in_products?: number | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          original_name?: string | null
          store_id?: string
          tags?: string[] | null
          updated_at?: string
          used_in_products?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_media_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_menu_items: {
        Row: {
          created_at: string
          footer_section: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          link_reference_id: string | null
          link_type: string
          menu_id: string
          open_in_new_tab: boolean | null
          parent_id: string | null
          position: number
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          footer_section?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          link_reference_id?: string | null
          link_type?: string
          menu_id: string
          open_in_new_tab?: boolean | null
          parent_id?: string | null
          position?: number
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          footer_section?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          link_reference_id?: string | null
          link_type?: string
          menu_id?: string
          open_in_new_tab?: boolean | null
          parent_id?: string | null
          position?: number
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_menu_items_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "store_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "store_menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      store_menus: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          location: string
          name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string
          name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          location?: string
          name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_menus_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_order_sequences: {
        Row: {
          last_number: number
          store_id: string
        }
        Insert: {
          last_number?: number
          store_id: string
        }
        Update: {
          last_number?: number
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_order_sequences_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_pages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          store_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_pages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_payment_gateways: {
        Row: {
          accept_boleto: boolean
          accept_credit_card: boolean
          accept_pix: boolean
          created_at: string
          credentials: Json | null
          display_name: string | null
          gateway_type: string
          id: string
          is_active: boolean
          is_sandbox: boolean
          last_verified_at: string | null
          oauth_access_token: string | null
          oauth_expires_at: string | null
          oauth_refresh_token: string | null
          oauth_user_id: string | null
          store_id: string
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          accept_boleto?: boolean
          accept_credit_card?: boolean
          accept_pix?: boolean
          created_at?: string
          credentials?: Json | null
          display_name?: string | null
          gateway_type: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          last_verified_at?: string | null
          oauth_access_token?: string | null
          oauth_expires_at?: string | null
          oauth_refresh_token?: string | null
          oauth_user_id?: string | null
          store_id: string
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          accept_boleto?: boolean
          accept_credit_card?: boolean
          accept_pix?: boolean
          created_at?: string
          credentials?: Json | null
          display_name?: string | null
          gateway_type?: string
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          last_verified_at?: string | null
          oauth_access_token?: string | null
          oauth_expires_at?: string | null
          oauth_refresh_token?: string | null
          oauth_user_id?: string | null
          store_id?: string
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_payment_gateways_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_policies: {
        Row: {
          content: string | null
          created_at: string
          generated_at: string | null
          id: string
          is_auto_generated: boolean | null
          is_published: boolean | null
          policy_type: string
          slug: string
          store_id: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          generated_at?: string | null
          id?: string
          is_auto_generated?: boolean | null
          is_published?: boolean | null
          policy_type: string
          slug: string
          store_id: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          generated_at?: string | null
          id?: string
          is_auto_generated?: boolean | null
          is_published?: boolean | null
          policy_type?: string
          slug?: string
          store_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_policies_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_tracking_config: {
        Row: {
          created_at: string
          exclude_shipping_from_value: boolean | null
          ga4_enabled: boolean | null
          ga4_measurement_id: string | null
          google_ads_conversion_label: string | null
          google_ads_enabled: boolean | null
          google_ads_id: string | null
          google_enhanced_conversions_enabled: boolean | null
          id: string
          meta_access_token: string | null
          meta_enabled: boolean | null
          meta_pixel_id: string | null
          meta_test_event_code: string | null
          pinterest_access_token: string | null
          pinterest_enabled: boolean | null
          pinterest_tag_id: string | null
          pinterest_test_event_code: string | null
          store_id: string
          tiktok_access_token: string | null
          tiktok_enabled: boolean | null
          tiktok_pixel_id: string | null
          tiktok_test_event_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exclude_shipping_from_value?: boolean | null
          ga4_enabled?: boolean | null
          ga4_measurement_id?: string | null
          google_ads_conversion_label?: string | null
          google_ads_enabled?: boolean | null
          google_ads_id?: string | null
          google_enhanced_conversions_enabled?: boolean | null
          id?: string
          meta_access_token?: string | null
          meta_enabled?: boolean | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          pinterest_access_token?: string | null
          pinterest_enabled?: boolean | null
          pinterest_tag_id?: string | null
          pinterest_test_event_code?: string | null
          store_id: string
          tiktok_access_token?: string | null
          tiktok_enabled?: boolean | null
          tiktok_pixel_id?: string | null
          tiktok_test_event_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exclude_shipping_from_value?: boolean | null
          ga4_enabled?: boolean | null
          ga4_measurement_id?: string | null
          google_ads_conversion_label?: string | null
          google_ads_enabled?: boolean | null
          google_ads_id?: string | null
          google_enhanced_conversions_enabled?: boolean | null
          id?: string
          meta_access_token?: string | null
          meta_enabled?: boolean | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          pinterest_access_token?: string | null
          pinterest_enabled?: boolean | null
          pinterest_tag_id?: string | null
          pinterest_test_event_code?: string | null
          store_id?: string
          tiktok_access_token?: string | null
          tiktok_enabled?: boolean | null
          tiktok_pixel_id?: string | null
          tiktok_test_event_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_tracking_config_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          announcement_bar_bg_color: string | null
          announcement_bar_enabled: boolean | null
          announcement_bar_speed: number | null
          announcement_bar_text_color: string | null
          business_name: string | null
          button_border_radius: string | null
          button_color: string | null
          button_hover_color: string | null
          button_text_color: string | null
          created_at: string
          currency: string
          default_shipping_cost: number | null
          description: string | null
          document: string | null
          document_type: string | null
          element_border_radius: string | null
          email: string | null
          facebook: string | null
          favicon_url: string | null
          font_family: string | null
          footer_bg_color: string | null
          footer_copyright_text: string | null
          footer_newsletter_enabled: boolean | null
          footer_newsletter_subtitle: string | null
          footer_newsletter_title: string | null
          footer_show_payment_methods: boolean | null
          footer_show_social_links: boolean | null
          footer_text_color: string | null
          free_shipping_threshold: number | null
          header_bg_color: string | null
          header_layout: string | null
          header_mobile_logo_position: string | null
          header_show_favorites: boolean | null
          header_show_search: boolean | null
          header_text_color: string | null
          id: string
          instagram: string | null
          is_active: boolean
          logo_url: string | null
          low_stock_threshold: number | null
          merchant_id: string
          meta_description: string | null
          meta_title: string | null
          name: string
          order_prefix: string | null
          phone: string | null
          policies_auto_generated: boolean | null
          policies_generated_at: string | null
          primary_text_color: string | null
          privacy_url: string | null
          return_policy_url: string | null
          secondary_text_color: string | null
          shipping_config: Json | null
          slug: string
          terms_url: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          tiktok: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          announcement_bar_bg_color?: string | null
          announcement_bar_enabled?: boolean | null
          announcement_bar_speed?: number | null
          announcement_bar_text_color?: string | null
          business_name?: string | null
          button_border_radius?: string | null
          button_color?: string | null
          button_hover_color?: string | null
          button_text_color?: string | null
          created_at?: string
          currency?: string
          default_shipping_cost?: number | null
          description?: string | null
          document?: string | null
          document_type?: string | null
          element_border_radius?: string | null
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          font_family?: string | null
          footer_bg_color?: string | null
          footer_copyright_text?: string | null
          footer_newsletter_enabled?: boolean | null
          footer_newsletter_subtitle?: string | null
          footer_newsletter_title?: string | null
          footer_show_payment_methods?: boolean | null
          footer_show_social_links?: boolean | null
          footer_text_color?: string | null
          free_shipping_threshold?: number | null
          header_bg_color?: string | null
          header_layout?: string | null
          header_mobile_logo_position?: string | null
          header_show_favorites?: boolean | null
          header_show_search?: boolean | null
          header_text_color?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          logo_url?: string | null
          low_stock_threshold?: number | null
          merchant_id: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
          order_prefix?: string | null
          phone?: string | null
          policies_auto_generated?: boolean | null
          policies_generated_at?: string | null
          primary_text_color?: string | null
          privacy_url?: string | null
          return_policy_url?: string | null
          secondary_text_color?: string | null
          shipping_config?: Json | null
          slug: string
          terms_url?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          tiktok?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          announcement_bar_bg_color?: string | null
          announcement_bar_enabled?: boolean | null
          announcement_bar_speed?: number | null
          announcement_bar_text_color?: string | null
          business_name?: string | null
          button_border_radius?: string | null
          button_color?: string | null
          button_hover_color?: string | null
          button_text_color?: string | null
          created_at?: string
          currency?: string
          default_shipping_cost?: number | null
          description?: string | null
          document?: string | null
          document_type?: string | null
          element_border_radius?: string | null
          email?: string | null
          facebook?: string | null
          favicon_url?: string | null
          font_family?: string | null
          footer_bg_color?: string | null
          footer_copyright_text?: string | null
          footer_newsletter_enabled?: boolean | null
          footer_newsletter_subtitle?: string | null
          footer_newsletter_title?: string | null
          footer_show_payment_methods?: boolean | null
          footer_show_social_links?: boolean | null
          footer_text_color?: string | null
          free_shipping_threshold?: number | null
          header_bg_color?: string | null
          header_layout?: string | null
          header_mobile_logo_position?: string | null
          header_show_favorites?: boolean | null
          header_show_search?: boolean | null
          header_text_color?: string | null
          id?: string
          instagram?: string | null
          is_active?: boolean
          logo_url?: string | null
          low_stock_threshold?: number | null
          merchant_id?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          order_prefix?: string | null
          phone?: string | null
          policies_auto_generated?: boolean | null
          policies_generated_at?: string | null
          primary_text_color?: string | null
          privacy_url?: string | null
          return_policy_url?: string | null
          secondary_text_color?: string | null
          shipping_config?: Json | null
          slug?: string
          terms_url?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          tiktok?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          category: Database["public"]["Enums"]["error_category"]
          created_at: string | null
          description: string
          error_count: number | null
          first_occurrence: string | null
          id: string
          last_occurrence: string | null
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["error_severity"]
          status: Database["public"]["Enums"]["alert_status"] | null
          store_id: string | null
          suggested_fix: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category: Database["public"]["Enums"]["error_category"]
          created_at?: string | null
          description: string
          error_count?: number | null
          first_occurrence?: string | null
          id?: string
          last_occurrence?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: Database["public"]["Enums"]["error_severity"]
          status?: Database["public"]["Enums"]["alert_status"] | null
          store_id?: string | null
          suggested_fix?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category?: Database["public"]["Enums"]["error_category"]
          created_at?: string | null
          description?: string
          error_count?: number | null
          first_occurrence?: string | null
          id?: string
          last_occurrence?: string | null
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["error_severity"]
          status?: Database["public"]["Enums"]["alert_status"] | null
          store_id?: string | null
          suggested_fix?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_alerts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      variants: {
        Row: {
          config: Json
          conversion_rate: number | null
          conversions: number
          created_at: string
          experiment_id: string
          id: string
          impressions: number
          is_winner: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          conversion_rate?: number | null
          conversions?: number
          created_at?: string
          experiment_id: string
          id?: string
          impressions?: number
          is_winner?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          conversion_rate?: number | null
          conversions?: number
          created_at?: string
          experiment_id?: string
          id?: string
          impressions?: number
          is_winner?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaign_recipients: {
        Row: {
          campaign_id: string
          created_at: string
          customer_id: string | null
          error_code: string | null
          error_message: string | null
          id: string
          message_id: string | null
          name: string | null
          phone: string
          sent_at: string | null
          status: string
          store_id: string
          variables: Json | null
          wa_message_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          customer_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          name?: string | null
          phone: string
          sent_at?: string | null
          status?: string
          store_id: string
          variables?: Json | null
          wa_message_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          customer_id?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_id?: string | null
          name?: string | null
          phone?: string
          sent_at?: string | null
          status?: string
          store_id?: string
          variables?: Json | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaign_recipients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaigns: {
        Row: {
          audience_filter: Json | null
          audience_type: string
          completed_at: string | null
          connection_id: string
          created_at: string
          created_by: string
          delivered_count: number
          failed_count: number
          id: string
          name: string
          read_count: number
          scheduled_at: string | null
          sent_count: number
          started_at: string | null
          status: string
          store_id: string
          template_id: string
          template_language_snapshot: string
          template_name_snapshot: string
          total_recipients: number
          updated_at: string
          variables_template: Json | null
        }
        Insert: {
          audience_filter?: Json | null
          audience_type: string
          completed_at?: string | null
          connection_id: string
          created_at?: string
          created_by: string
          delivered_count?: number
          failed_count?: number
          id?: string
          name: string
          read_count?: number
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          store_id: string
          template_id: string
          template_language_snapshot?: string
          template_name_snapshot: string
          total_recipients?: number
          updated_at?: string
          variables_template?: Json | null
        }
        Update: {
          audience_filter?: Json | null
          audience_type?: string
          completed_at?: string | null
          connection_id?: string
          created_at?: string
          created_by?: string
          delivered_count?: number
          failed_count?: number
          id?: string
          name?: string
          read_count?: number
          scheduled_at?: string | null
          sent_count?: number
          started_at?: string | null
          status?: string
          store_id?: string
          template_id?: string
          template_language_snapshot?: string
          template_name_snapshot?: string
          total_recipients?: number
          updated_at?: string
          variables_template?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_connections: {
        Row: {
          access_token: string
          business_id: string | null
          connected_by: string | null
          created_at: string
          id: string
          meta_user_id: string | null
          status: string
          store_id: string
          token_expires_at: string | null
          updated_at: string
          waba_id: string
        }
        Insert: {
          access_token: string
          business_id?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          meta_user_id?: string | null
          status?: string
          store_id: string
          token_expires_at?: string | null
          updated_at?: string
          waba_id: string
        }
        Update: {
          access_token?: string
          business_id?: string | null
          connected_by?: string | null
          created_at?: string
          id?: string
          meta_user_id?: string | null
          status?: string
          store_id?: string
          token_expires_at?: string | null
          updated_at?: string
          waba_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          connection_id: string
          contact_name: string | null
          contact_phone: string
          created_at: string
          customer_id: string | null
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          phone_number_id: string | null
          status: string
          store_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          connection_id: string
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_number_id?: string | null
          status?: string
          store_id: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          connection_id?: string
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_number_id?: string | null
          status?: string
          store_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          body: string | null
          campaign_id: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          media_mime_type: string | null
          media_url: string | null
          read_at: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          store_id: string
          template_name: string | null
          template_variables: Json | null
          type: string
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          campaign_id?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          store_id: string
          template_name?: string | null
          template_variables?: Json | null
          type?: string
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          campaign_id?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          media_mime_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          store_id?: string
          template_name?: string | null
          template_variables?: Json | null
          type?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_campaign_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_phone_numbers: {
        Row: {
          connection_id: string
          created_at: string
          display_phone_number: string
          id: string
          is_primary: boolean
          phone_number_id: string
          quality_rating: string | null
          store_id: string
          updated_at: string
          verified_name: string | null
        }
        Insert: {
          connection_id: string
          created_at?: string
          display_phone_number: string
          id?: string
          is_primary?: boolean
          phone_number_id: string
          quality_rating?: string | null
          store_id: string
          updated_at?: string
          verified_name?: string | null
        }
        Update: {
          connection_id?: string
          created_at?: string
          display_phone_number?: string
          id?: string
          is_primary?: boolean
          phone_number_id?: string
          quality_rating?: string | null
          store_id?: string
          updated_at?: string
          verified_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_phone_numbers_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_phone_numbers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          category: string
          components: Json
          connection_id: string
          created_at: string
          id: string
          language: string
          meta_template_id: string | null
          name: string
          rejected_reason: string | null
          status: string
          store_id: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          components?: Json
          connection_id: string
          created_at?: string
          id?: string
          language?: string
          meta_template_id?: string | null
          name: string
          rejected_reason?: string | null
          status?: string
          store_id: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          components?: Json
          connection_id?: string
          created_at?: string
          id?: string
          language?: string
          meta_template_id?: string | null
          name?: string
          rejected_reason?: string | null
          status?: string
          store_id?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_platform_kpis: { Args: never; Returns: Json }
      admin_get_stores: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_status?: string
        }
        Returns: Json
      }
      admin_toggle_store_status: {
        Args: { p_store_id: string }
        Returns: boolean
      }
      admin_update_store: {
        Args: { p_name?: string; p_slug?: string; p_store_id: string }
        Returns: boolean
      }
      confirm_order_payment_atomic: {
        Args: { p_new_status?: string; p_order_id: string }
        Returns: Json
      }
      create_default_attributes_for_store: {
        Args: { store_id_param: string }
        Returns: undefined
      }
      decrement_stock_for_order: {
        Args: { order_id_param: string }
        Returns: undefined
      }
      delete_failed_order: { Args: { p_order_id: string }; Returns: boolean }
      generate_unique_store_slug: {
        Args: { exclude_store_id?: string; store_name: string }
        Returns: string
      }
      get_abandoned_cart_analytics: {
        Args: { days_back?: number; store_id_param: string }
        Returns: Json
      }
      get_gateway_checkout_config: {
        Args: { store_id_param: string }
        Returns: Json
      }
      get_order_for_checkout_view: {
        Args: { p_order_id: string }
        Returns: {
          created_at: string
          customer_id: string | null
          desconto: number
          endereco_entrega: Json | null
          forma_pagamento: string | null
          frete: number
          id: string
          observacao_cliente: string | null
          order_number: number | null
          product_snapshots: Json | null
          products: Json
          purchase_event_id: string
          purchase_event_sent_at: string | null
          status_pagamento: string
          status_pedido: string
          stock_updated: boolean | null
          store_id: string
          subtotal: number
          total: number
          tracking_carrier: string | null
          tracking_code: string | null
          tracking_code_sent_at: string | null
          tracking_url: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_store_email_settings: { Args: { p_store_id: string }; Returns: Json }
      get_store_order_products_for_ranking: {
        Args: { p_limit?: number; p_status?: string; p_store_id: string }
        Returns: {
          products: Json
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_email_log:
        | {
            Args: {
              p_abandoned_cart_id?: string
              p_email_type: string
              p_error_message?: string
              p_order_id?: string
              p_recipient_email?: string
              p_recipient_name?: string
              p_resend_id?: string
              p_status?: string
              p_store_id?: string
              p_subject?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_email_type: string
              p_error_message?: string
              p_order_id: string
              p_recipient_email: string
              p_recipient_name: string
              p_resend_id?: string
              p_status: string
              p_store_id: string
              p_subject: string
            }
            Returns: string
          }
      lookup_customer_for_checkout: {
        Args: { p_cpf?: string; p_email?: string; p_store_id: string }
        Returns: Json
      }
      mark_cart_recovered: {
        Args: {
          p_customer_email: string
          p_order_id: string
          p_store_id: string
        }
        Returns: undefined
      }
      save_abandoned_cart:
        | {
            Args: {
              p_cart_items?: Json
              p_cart_total?: number
              p_customer_email: string
              p_customer_id?: string
              p_customer_name?: string
              p_store_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_cart_items?: Json
              p_cart_total?: number
              p_customer_email: string
              p_customer_id?: string
              p_customer_name?: string
              p_customer_phone?: string
              p_store_id: string
            }
            Returns: string
          }
      try_lock_order_processing: {
        Args: { order_id_param: string }
        Returns: boolean
      }
      upsert_customer_for_checkout: {
        Args: {
          p_cpf: string
          p_data_nascimento?: string
          p_email?: string
          p_nome: string
          p_store_id: string
          p_telefone?: string
        }
        Returns: string
      }
      validate_stock_for_checkout: { Args: { items: Json }; Returns: Json }
      validate_stock_for_checkout_strict: {
        Args: { items: Json }
        Returns: Json
      }
    }
    Enums: {
      alert_status: "new" | "acknowledged" | "resolved" | "ignored"
      app_role: "sellify_admin" | "merchant" | "customer"
      error_category:
        | "frontend"
        | "backend"
        | "database"
        | "ab_testing"
        | "checkout"
        | "payment"
        | "shipping"
        | "email"
        | "recommendations"
        | "upsell"
        | "performance"
        | "security"
        | "other"
      error_severity: "low" | "medium" | "high" | "critical"
      whatsapp_automation_trigger:
        | "abandoned_cart"
        | "post_purchase"
        | "welcome"
        | "birthday"
        | "restock"
        | "custom"
        | "pix_pending"
        | "boleto_pending"
      whatsapp_campaign_status:
        | "draft"
        | "scheduled"
        | "sending"
        | "sent"
        | "cancelled"
      whatsapp_conversation_status: "active" | "expired" | "closed"
      whatsapp_message_direction: "inbound" | "outbound"
      whatsapp_message_status:
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "undelivered"
      whatsapp_provider_type: "twilio" | "meta_cloud_api"
      whatsapp_template_status: "pending" | "approved" | "rejected"
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
      alert_status: ["new", "acknowledged", "resolved", "ignored"],
      app_role: ["sellify_admin", "merchant", "customer"],
      error_category: [
        "frontend",
        "backend",
        "database",
        "ab_testing",
        "checkout",
        "payment",
        "shipping",
        "email",
        "recommendations",
        "upsell",
        "performance",
        "security",
        "other",
      ],
      error_severity: ["low", "medium", "high", "critical"],
      whatsapp_automation_trigger: [
        "abandoned_cart",
        "post_purchase",
        "welcome",
        "birthday",
        "restock",
        "custom",
        "pix_pending",
        "boleto_pending",
      ],
      whatsapp_campaign_status: [
        "draft",
        "scheduled",
        "sending",
        "sent",
        "cancelled",
      ],
      whatsapp_conversation_status: ["active", "expired", "closed"],
      whatsapp_message_direction: ["inbound", "outbound"],
      whatsapp_message_status: [
        "queued",
        "sent",
        "delivered",
        "read",
        "failed",
        "undelivered",
      ],
      whatsapp_provider_type: ["twilio", "meta_cloud_api"],
      whatsapp_template_status: ["pending", "approved", "rejected"],
    },
  },
} as const
