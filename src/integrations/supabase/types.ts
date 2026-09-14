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
      appointment_invitations: {
        Row: {
          created_at: string
          id: string
          invitation_type: string
          message: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invitation_type: string
          message?: string | null
          order_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invitation_type?: string
          message?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_invitations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_invitations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_due_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_invitations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_overdue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_invitations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_no_followup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_invitations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_stale"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          created_at: string
          customer_email: string
          customer_profile_id: string | null
          end_time: string
          first_name: string
          id: string
          last_name: string
          order_id: string | null
          phone: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_type: string
          created_at?: string
          customer_email: string
          customer_profile_id?: string | null
          end_time: string
          first_name: string
          id?: string
          last_name: string
          order_id?: string | null
          phone?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          customer_email?: string
          customer_profile_id?: string | null
          end_time?: string
          first_name?: string
          id?: string
          last_name?: string
          order_id?: string | null
          phone?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_due_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_overdue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_no_followup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_stale"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          created_at: string
          created_by: string | null
          follow_up_reason: string | null
          id: string
          interaction_type: string
          next_follow_up_date: string | null
          occurred_at: string
          profile_id: string
          related_order_id: string | null
          resolved_follow_up: boolean
          summary: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          follow_up_reason?: string | null
          id?: string
          interaction_type: string
          next_follow_up_date?: string | null
          occurred_at?: string
          profile_id: string
          related_order_id?: string | null
          resolved_follow_up?: boolean
          summary: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          follow_up_reason?: string | null
          id?: string
          interaction_type?: string
          next_follow_up_date?: string | null
          occurred_at?: string
          profile_id?: string
          related_order_id?: string | null
          resolved_follow_up?: boolean
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_due_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_overdue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_no_followup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "v_production_stale"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tag_assignments: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tag_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "client_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          label: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          label: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      finished_products: {
        Row: {
          client_cost: number | null
          cost: number | null
          created_at: string
          created_by: string | null
          customer_profile_id: string | null
          gem_sku: string | null
          id: string
          metal_color: string
          metal_color_other: string | null
          metal_type: string
          notes: string | null
          order_id: string | null
          product_type: string
          product_type_other: string | null
          stone_type: string | null
          updated_at: string
          weight: string | null
        }
        Insert: {
          client_cost?: number | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          customer_profile_id?: string | null
          gem_sku?: string | null
          id?: string
          metal_color: string
          metal_color_other?: string | null
          metal_type: string
          notes?: string | null
          order_id?: string | null
          product_type: string
          product_type_other?: string | null
          stone_type?: string | null
          updated_at?: string
          weight?: string | null
        }
        Update: {
          client_cost?: number | null
          cost?: number | null
          created_at?: string
          created_by?: string | null
          customer_profile_id?: string | null
          gem_sku?: string | null
          id?: string
          metal_color?: string
          metal_color_other?: string | null
          metal_type?: string
          notes?: string | null
          order_id?: string | null
          product_type?: string
          product_type_other?: string | null
          stone_type?: string | null
          updated_at?: string
          weight?: string | null
        }
        Relationships: []
      }
      order_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          order_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          order_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          order_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_due_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_overdue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_no_followup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_stale"
            referencedColumns: ["id"]
          },
        ]
      }
      order_notes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          note_date: string
          order_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note: string
          note_date?: string
          order_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          note_date?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_due_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_overdue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_no_followup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_notes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_stale"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          blocked_reason: string | null
          budget: number | null
          colour: string | null
          created_at: string
          created_by: string | null
          customer_email: string
          customer_profile_id: string | null
          delivery_date: string | null
          deposit: number | null
          first_name: string | null
          follow_up_owner_id: string | null
          follow_up_reason: string | null
          google_calendar_event_id: string | null
          id: string
          internal_priority: string
          item_description: string
          last_contacted_at: string | null
          last_name: string | null
          metal: string | null
          metal_type: string | null
          next_follow_up_date: string | null
          notes: string | null
          order_date: string | null
          order_number: string
          order_type: string
          phone1: string | null
          phone2: string | null
          preferred_contact_method: string
          private_follow_up_notes: string | null
          production_updated_at: string | null
          rhodium_polish: boolean | null
          ring_size: string | null
          status: string
          stone_size: string | null
          stone_type: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string
          created_by?: string | null
          customer_email: string
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string
          internal_priority?: string
          item_description: string
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string
          order_type: string
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string
          created_by?: string | null
          customer_email?: string
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string
          internal_priority?: string
          item_description?: string
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string
          order_type?: string
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_number: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          sms_consent: boolean
          source: string | null
          source_detail: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          client_number?: string | null
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          sms_consent?: boolean
          source?: string | null
          source_detail?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          client_number?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          sms_consent?: boolean
          source?: string | null
          source_detail?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string
          responded_at: string | null
          sent_at: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          responded_at?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          responded_at?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_due_today"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_followups_overdue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_no_followup"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_production_stale"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_followups_due_today: {
        Row: {
          address: string | null
          blocked_reason: string | null
          budget: number | null
          colour: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_profile_id: string | null
          delivery_date: string | null
          deposit: number | null
          first_name: string | null
          follow_up_owner_id: string | null
          follow_up_reason: string | null
          google_calendar_event_id: string | null
          id: string | null
          internal_priority: string | null
          item_description: string | null
          last_contacted_at: string | null
          last_name: string | null
          metal: string | null
          metal_type: string | null
          next_follow_up_date: string | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          order_type: string | null
          phone1: string | null
          phone2: string | null
          preferred_contact_method: string | null
          private_follow_up_notes: string | null
          production_updated_at: string | null
          rhodium_polish: boolean | null
          ring_size: string | null
          status: string | null
          stone_size: string | null
          stone_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string | null
          internal_priority?: string | null
          item_description?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string | null
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string | null
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string | null
          internal_priority?: string | null
          item_description?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string | null
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string | null
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_followups_overdue: {
        Row: {
          address: string | null
          blocked_reason: string | null
          budget: number | null
          colour: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_profile_id: string | null
          delivery_date: string | null
          deposit: number | null
          first_name: string | null
          follow_up_owner_id: string | null
          follow_up_reason: string | null
          google_calendar_event_id: string | null
          id: string | null
          internal_priority: string | null
          item_description: string | null
          last_contacted_at: string | null
          last_name: string | null
          metal: string | null
          metal_type: string | null
          next_follow_up_date: string | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          order_type: string | null
          phone1: string | null
          phone2: string | null
          preferred_contact_method: string | null
          private_follow_up_notes: string | null
          production_updated_at: string | null
          rhodium_polish: boolean | null
          ring_size: string | null
          status: string | null
          stone_size: string | null
          stone_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string | null
          internal_priority?: string | null
          item_description?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string | null
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string | null
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string | null
          internal_priority?: string | null
          item_description?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string | null
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string | null
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_no_followup: {
        Row: {
          address: string | null
          blocked_reason: string | null
          budget: number | null
          colour: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_profile_id: string | null
          delivery_date: string | null
          deposit: number | null
          first_name: string | null
          follow_up_owner_id: string | null
          follow_up_reason: string | null
          google_calendar_event_id: string | null
          id: string | null
          internal_priority: string | null
          item_description: string | null
          last_contacted_at: string | null
          last_name: string | null
          metal: string | null
          metal_type: string | null
          next_follow_up_date: string | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          order_type: string | null
          phone1: string | null
          phone2: string | null
          preferred_contact_method: string | null
          private_follow_up_notes: string | null
          production_updated_at: string | null
          rhodium_polish: boolean | null
          ring_size: string | null
          status: string | null
          stone_size: string | null
          stone_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string | null
          internal_priority?: string | null
          item_description?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string | null
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string | null
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string | null
          internal_priority?: string | null
          item_description?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string | null
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string | null
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      v_production_stale: {
        Row: {
          address: string | null
          blocked_reason: string | null
          budget: number | null
          colour: string | null
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_profile_id: string | null
          delivery_date: string | null
          deposit: number | null
          first_name: string | null
          follow_up_owner_id: string | null
          follow_up_reason: string | null
          google_calendar_event_id: string | null
          id: string | null
          internal_priority: string | null
          item_description: string | null
          last_contacted_at: string | null
          last_name: string | null
          metal: string | null
          metal_type: string | null
          next_follow_up_date: string | null
          notes: string | null
          order_date: string | null
          order_number: string | null
          order_type: string | null
          phone1: string | null
          phone2: string | null
          preferred_contact_method: string | null
          private_follow_up_notes: string | null
          production_updated_at: string | null
          rhodium_polish: boolean | null
          ring_size: string | null
          status: string | null
          stone_size: string | null
          stone_type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string | null
          internal_priority?: string | null
          item_description?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string | null
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string | null
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          blocked_reason?: string | null
          budget?: number | null
          colour?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_profile_id?: string | null
          delivery_date?: string | null
          deposit?: number | null
          first_name?: string | null
          follow_up_owner_id?: string | null
          follow_up_reason?: string | null
          google_calendar_event_id?: string | null
          id?: string | null
          internal_priority?: string | null
          item_description?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          metal?: string | null
          metal_type?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          order_date?: string | null
          order_number?: string | null
          order_type?: string | null
          phone1?: string | null
          phone2?: string | null
          preferred_contact_method?: string | null
          private_follow_up_notes?: string | null
          production_updated_at?: string | null
          rhodium_polish?: boolean | null
          ring_size?: string | null
          status?: string | null
          stone_size?: string | null
          stone_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_profile_id_fkey"
            columns: ["customer_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _merge_profile: {
        Args: { _canonical: string; _dup: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_domain: { Args: { _e: string }; Returns: string }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_my_profile_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_placeholder_email: { Args: { _e: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      norm_name: { Args: { _first: string; _last: string }; Returns: string }
      norm_phone: { Args: { _p: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "customer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff", "customer"],
    },
  },
} as const
