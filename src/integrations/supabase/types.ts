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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      callback_requests: {
        Row: {
          admin_notes: string | null
          called_at: string | null
          completed_at: string | null
          contact_channel: string
          contact_handle: string | null
          created_at: string
          id: string
          intent: string
          is_international: boolean
          name: string
          phone: string | null
          preferred_date: string
          preferred_datetime_ist: string | null
          preferred_slot: string
          property_id: string | null
          status: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          called_at?: string | null
          completed_at?: string | null
          contact_channel?: string
          contact_handle?: string | null
          created_at?: string
          id?: string
          intent: string
          is_international?: boolean
          name: string
          phone?: string | null
          preferred_date: string
          preferred_datetime_ist?: string | null
          preferred_slot: string
          property_id?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          called_at?: string | null
          completed_at?: string | null
          contact_channel?: string
          contact_handle?: string | null
          created_at?: string
          id?: string
          intent?: string
          is_international?: boolean
          name?: string
          phone?: string | null
          preferred_date?: string
          preferred_datetime_ist?: string | null
          preferred_slot?: string
          property_id?: string | null
          status?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "callback_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callback_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_allowlist: {
        Row: {
          added_at: string
          word: string
        }
        Insert: {
          added_at?: string
          word: string
        }
        Update: {
          added_at?: string
          word?: string
        }
        Relationships: []
      }
      comment_blocklist: {
        Row: {
          added_at: string
          tier: string
          word: string
        }
        Insert: {
          added_at?: string
          tier?: string
          word: string
        }
        Update: {
          added_at?: string
          tier?: string
          word?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "property_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_moderation_actions: {
        Row: {
          action: string
          admin_id: string | null
          comment_id: string
          created_at: string
          id: string
        }
        Insert: {
          action: string
          admin_id?: string | null
          comment_id: string
          created_at?: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string | null
          comment_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_moderation_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_moderation_actions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "property_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          notes: string | null
          reason: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "property_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          approved_at: string | null
          attempt_number: number
          auto_cancelled_at: string | null
          consent_checked_at: string
          consent_terms_version: number
          created_at: string
          decline_reason:
            | Database["public"]["Enums"]["contact_request_decline_reason"]
            | null
          declined_at: string | null
          id: string
          owner_id: string
          property_id: string
          status: Database["public"]["Enums"]["contact_request_status"]
          tenant_id: string
          tenant_message: string | null
          tenant_profile_snapshot: Json
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          approved_at?: string | null
          attempt_number?: number
          auto_cancelled_at?: string | null
          consent_checked_at: string
          consent_terms_version?: number
          created_at?: string
          decline_reason?:
            | Database["public"]["Enums"]["contact_request_decline_reason"]
            | null
          declined_at?: string | null
          id?: string
          owner_id: string
          property_id: string
          status?: Database["public"]["Enums"]["contact_request_status"]
          tenant_id: string
          tenant_message?: string | null
          tenant_profile_snapshot: Json
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          approved_at?: string | null
          attempt_number?: number
          auto_cancelled_at?: string | null
          consent_checked_at?: string
          consent_terms_version?: number
          created_at?: string
          decline_reason?:
            | Database["public"]["Enums"]["contact_request_decline_reason"]
            | null
          declined_at?: string | null
          id?: string
          owner_id?: string
          property_id?: string
          status?: Database["public"]["Enums"]["contact_request_status"]
          tenant_id?: string
          tenant_message?: string | null
          tenant_profile_snapshot?: Json
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          contact_request_id: string | null
          created_at: string
          error_reason: string | null
          event_type: string
          id: string
          raw_payload: Json | null
          recipient_email: string | null
          recipient_user_id: string | null
          resend_message_id: string | null
        }
        Insert: {
          contact_request_id?: string | null
          created_at?: string
          error_reason?: string | null
          event_type: string
          id?: string
          raw_payload?: Json | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          resend_message_id?: string | null
        }
        Update: {
          contact_request_id?: string | null
          created_at?: string
          error_reason?: string | null
          event_type?: string
          id?: string
          raw_payload?: Json | null
          recipient_email?: string | null
          recipient_user_id?: string | null
          resend_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_send_log_contact_request_id_fkey"
            columns: ["contact_request_id"]
            isOneToOne: false
            referencedRelation: "contact_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_send_log_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favourites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favourites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_place_aliases: {
        Row: {
          alias: string
          created_at: string
          geo_place_id: string
          id: string
          language: string | null
          normalized_alias: string
          updated_at: string
        }
        Insert: {
          alias: string
          created_at?: string
          geo_place_id: string
          id?: string
          language?: string | null
          normalized_alias: string
          updated_at?: string
        }
        Update: {
          alias?: string
          created_at?: string
          geo_place_id?: string
          id?: string
          language?: string | null
          normalized_alias?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_place_aliases_geo_place_id_fkey"
            columns: ["geo_place_id"]
            isOneToOne: false
            referencedRelation: "geo_places"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_places: {
        Row: {
          anchor_quality: string | null
          bbox_ne_lat: number | null
          bbox_ne_lng: number | null
          bbox_sw_lat: number | null
          bbox_sw_lng: number | null
          center_lat: number | null
          center_lng: number | null
          created_at: string
          display_name: string
          id: string
          kind: string
          normalized_name: string | null
          parent_geo_place_id: string | null
          place_id: string | null
          representative_point: unknown
          search_region_id: string | null
          settlement_subtype: string | null
          updated_at: string
        }
        Insert: {
          anchor_quality?: string | null
          bbox_ne_lat?: number | null
          bbox_ne_lng?: number | null
          bbox_sw_lat?: number | null
          bbox_sw_lng?: number | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          display_name: string
          id?: string
          kind: string
          normalized_name?: string | null
          parent_geo_place_id?: string | null
          place_id?: string | null
          representative_point?: unknown
          search_region_id?: string | null
          settlement_subtype?: string | null
          updated_at?: string
        }
        Update: {
          anchor_quality?: string | null
          bbox_ne_lat?: number | null
          bbox_ne_lng?: number | null
          bbox_sw_lat?: number | null
          bbox_sw_lng?: number | null
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          display_name?: string
          id?: string
          kind?: string
          normalized_name?: string | null
          parent_geo_place_id?: string | null
          place_id?: string | null
          representative_point?: unknown
          search_region_id?: string | null
          settlement_subtype?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_places_parent_geo_place_id_fkey"
            columns: ["parent_geo_place_id"]
            isOneToOne: false
            referencedRelation: "geo_places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "geo_places_search_region_id_fkey"
            columns: ["search_region_id"]
            isOneToOne: false
            referencedRelation: "geo_places"
            referencedColumns: ["id"]
          },
        ]
      }
      geo_provider_refs: {
        Row: {
          created_at: string
          geo_place_id: string
          id: string
          last_verified_at: string | null
          provider: string
          provider_place_id: string
          provider_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          geo_place_id: string
          id?: string
          last_verified_at?: string | null
          provider: string
          provider_place_id: string
          provider_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          geo_place_id?: string
          id?: string
          last_verified_at?: string | null
          provider?: string
          provider_place_id?: string
          provider_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "geo_provider_refs_geo_place_id_fkey"
            columns: ["geo_place_id"]
            isOneToOne: false
            referencedRelation: "geo_places"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_appliances: {
        Row: {
          appliance_type: Database["public"]["Enums"]["appliance_type"]
          brand: string | null
          color: string | null
          condition: Database["public"]["Enums"]["appliance_condition"] | null
          created_at: string
          custom_label: string | null
          id: string
          inspection_id: string
          last_service_date: string | null
          location: string | null
          manufacturing_year: number | null
          model_number: string | null
          notes: string | null
          ownership: Database["public"]["Enums"]["appliance_ownership"] | null
          serial_number: string | null
          updated_at: string
        }
        Insert: {
          appliance_type: Database["public"]["Enums"]["appliance_type"]
          brand?: string | null
          color?: string | null
          condition?: Database["public"]["Enums"]["appliance_condition"] | null
          created_at?: string
          custom_label?: string | null
          id?: string
          inspection_id: string
          last_service_date?: string | null
          location?: string | null
          manufacturing_year?: number | null
          model_number?: string | null
          notes?: string | null
          ownership?: Database["public"]["Enums"]["appliance_ownership"] | null
          serial_number?: string | null
          updated_at?: string
        }
        Update: {
          appliance_type?: Database["public"]["Enums"]["appliance_type"]
          brand?: string | null
          color?: string | null
          condition?: Database["public"]["Enums"]["appliance_condition"] | null
          created_at?: string
          custom_label?: string | null
          id?: string
          inspection_id?: string
          last_service_date?: string | null
          location?: string | null
          manufacturing_year?: number | null
          model_number?: string | null
          notes?: string | null
          ownership?: Database["public"]["Enums"]["appliance_ownership"] | null
          serial_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_appliances_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "property_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_callbacks: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          id: string
          owner_id: string
          property_id: string
          rescheduled_at: string | null
          scheduled_at: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          owner_id: string
          property_id: string
          rescheduled_at?: string | null
          scheduled_at: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          property_id?: string
          rescheduled_at?: string | null
          scheduled_at?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_callbacks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_callbacks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_reports: {
        Row: {
          generated_at: string
          generated_by: string
          id: string
          inspection_id: string
          inspector_name_snapshot: string
          report_type: string
        }
        Insert: {
          generated_at?: string
          generated_by: string
          id?: string
          inspection_id: string
          inspector_name_snapshot: string
          report_type: string
        }
        Update: {
          generated_at?: string
          generated_by?: string
          id?: string
          inspection_id?: string
          inspector_name_snapshot?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_reports_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspection_reports_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "property_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_rooms: {
        Row: {
          ceiling_condition:
            | Database["public"]["Enums"]["room_condition"]
            | null
          ceiling_notes: string | null
          created_at: string
          doors_windows_condition:
            | Database["public"]["Enums"]["room_condition"]
            | null
          doors_windows_notes: string | null
          electrical_condition:
            | Database["public"]["Enums"]["room_condition"]
            | null
          electrical_notes: string | null
          flooring_condition:
            | Database["public"]["Enums"]["room_condition"]
            | null
          flooring_notes: string | null
          furniture_items: Json | null
          id: string
          inspection_id: string
          overall_room_notes: string | null
          paint_condition: string | null
          plumbing_condition:
            | Database["public"]["Enums"]["room_condition"]
            | null
          plumbing_notes: string | null
          room_features: Json | null
          room_label: string
          room_type: Database["public"]["Enums"]["room_type"]
          sort_order: number
          updated_at: string
          walls_condition: Database["public"]["Enums"]["room_condition"] | null
          walls_notes: string | null
        }
        Insert: {
          ceiling_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          ceiling_notes?: string | null
          created_at?: string
          doors_windows_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          doors_windows_notes?: string | null
          electrical_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          electrical_notes?: string | null
          flooring_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          flooring_notes?: string | null
          furniture_items?: Json | null
          id?: string
          inspection_id: string
          overall_room_notes?: string | null
          paint_condition?: string | null
          plumbing_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          plumbing_notes?: string | null
          room_features?: Json | null
          room_label: string
          room_type: Database["public"]["Enums"]["room_type"]
          sort_order?: number
          updated_at?: string
          walls_condition?: Database["public"]["Enums"]["room_condition"] | null
          walls_notes?: string | null
        }
        Update: {
          ceiling_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          ceiling_notes?: string | null
          created_at?: string
          doors_windows_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          doors_windows_notes?: string | null
          electrical_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          electrical_notes?: string | null
          flooring_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          flooring_notes?: string | null
          furniture_items?: Json | null
          id?: string
          inspection_id?: string
          overall_room_notes?: string | null
          paint_condition?: string | null
          plumbing_condition?:
            | Database["public"]["Enums"]["room_condition"]
            | null
          plumbing_notes?: string | null
          room_features?: Json | null
          room_label?: string
          room_type?: Database["public"]["Enums"]["room_type"]
          sort_order?: number
          updated_at?: string
          walls_condition?: Database["public"]["Enums"]["room_condition"] | null
          walls_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspection_rooms_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "property_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      interaction_ratings: {
        Row: {
          contact_request_id: string
          created_at: string
          id: string
          o_accuracy: string | null
          o_progress: string | null
          o_q1_communication: string | null
          o_q2_visit: string | null
          o_q3_deal_again: string | null
          o_reach: string | null
          o_respect: string | null
          o_review_text: string | null
          o_submitted_at: string | null
          o_trust: string | null
          o_v2_submitted_at: string | null
          owner_id: string
          property_id: string
          t_accuracy: string | null
          t_progress: string | null
          t_q1_communication: string | null
          t_q2_visit: string | null
          t_q3_deal_again: string | null
          t_reach: string | null
          t_respect: string | null
          t_review_text: string | null
          t_submitted_at: string | null
          t_trust: string | null
          t_v2_submitted_at: string | null
          tenant_id: string
          updated_at: string
          window_closes_at: string
          window_opens_at: string
        }
        Insert: {
          contact_request_id: string
          created_at?: string
          id?: string
          o_accuracy?: string | null
          o_progress?: string | null
          o_q1_communication?: string | null
          o_q2_visit?: string | null
          o_q3_deal_again?: string | null
          o_reach?: string | null
          o_respect?: string | null
          o_review_text?: string | null
          o_submitted_at?: string | null
          o_trust?: string | null
          o_v2_submitted_at?: string | null
          owner_id: string
          property_id: string
          t_accuracy?: string | null
          t_progress?: string | null
          t_q1_communication?: string | null
          t_q2_visit?: string | null
          t_q3_deal_again?: string | null
          t_reach?: string | null
          t_respect?: string | null
          t_review_text?: string | null
          t_submitted_at?: string | null
          t_trust?: string | null
          t_v2_submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          window_closes_at: string
          window_opens_at: string
        }
        Update: {
          contact_request_id?: string
          created_at?: string
          id?: string
          o_accuracy?: string | null
          o_progress?: string | null
          o_q1_communication?: string | null
          o_q2_visit?: string | null
          o_q3_deal_again?: string | null
          o_reach?: string | null
          o_respect?: string | null
          o_review_text?: string | null
          o_submitted_at?: string | null
          o_trust?: string | null
          o_v2_submitted_at?: string | null
          owner_id?: string
          property_id?: string
          t_accuracy?: string | null
          t_progress?: string | null
          t_q1_communication?: string | null
          t_q2_visit?: string | null
          t_q3_deal_again?: string | null
          t_reach?: string | null
          t_respect?: string | null
          t_review_text?: string | null
          t_submitted_at?: string | null
          t_trust?: string | null
          t_v2_submitted_at?: string | null
          tenant_id?: string
          updated_at?: string
          window_closes_at?: string
          window_opens_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interaction_ratings_contact_request_id_fkey"
            columns: ["contact_request_id"]
            isOneToOne: true
            referencedRelation: "contact_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_ratings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_ratings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_ratings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_action_acknowledgments: {
        Row: {
          acknowledged_at: string
          activity_log_id: string | null
          id: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          activity_log_id?: string | null
          id?: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          activity_log_id?: string | null
          id?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_action_acknowledgments_activity_log_id_fkey"
            columns: ["activity_log_id"]
            isOneToOne: false
            referencedRelation: "property_activity_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_action_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          display_name: string | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          id: string
          is_public: boolean
          profile_photo_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          is_public?: boolean
          profile_photo_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          display_name?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          id?: string
          is_public?: boolean
          profile_photo_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_mode: string | null
          amenities: Json | null
          annual_rent_increase_pct: number | null
          auto_accept_enabled: boolean
          availability_confirmed_at: string | null
          available_from: string | null
          balconies: number | null
          bathrooms: number | null
          bhk: Database["public"]["Enums"]["bhk_type"] | null
          board_installed_at: string | null
          board_qr_code: string | null
          board_removed_at: string | null
          board_status: Database["public"]["Enums"]["board_status"]
          building_age_years: number | null
          building_name: string | null
          building_name_source: string | null
          building_notes: string | null
          building_rules: string | null
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string
          current_listed_period_started_at: string | null
          description: string | null
          discovery_confirmed_at: string | null
          discovery_finalized_at: string | null
          district: string | null
          draft_at: string | null
          expected_price_per_sqft: number | null
          facing: string | null
          flat_number: string | null
          flat_number_revealed: boolean
          floor_number: number | null
          formatted_address: string | null
          furnishing: Database["public"]["Enums"]["furnishing_type"] | null
          furnishing_detail: Json | null
          gas_type: string | null
          geom_exact: unknown
          google_maps_url: string | null
          id: string
          is_active: boolean
          khata_type: string | null
          landmark: string | null
          last_public_listed_rent: number | null
          last_public_sale_price: number | null
          latitude: number | null
          legal_owner_name: string | null
          listed_at: string | null
          listed_rent: number
          lister_flat_number: string | null
          lister_role: string
          listing_type: Database["public"]["Enums"]["property_listing_type"]
          locality: string | null
          location_confirmed_at: string | null
          location_verified_at: string | null
          location_verified_by_owner: boolean
          lock_in_months: number | null
          longitude: number | null
          main_door_lock_type: string | null
          maintenance_included_in_rent: boolean
          move_in_charges_amount: number | null
          neighborhood: string | null
          notice_period_days: number | null
          notice_period_months: number | null
          owner_committed_12_months: boolean | null
          owner_diet_preference: string | null
          owner_has_local_rep: boolean | null
          owner_id: string
          owner_income_dependent: boolean | null
          owner_lives_in_same_city: boolean | null
          owner_only_rental_property: boolean | null
          owner_pet_preference: string | null
          owner_pin_adjusted_at: string | null
          owner_pin_adjustment_distance_m: number | null
          owner_prefers_phone_calls: boolean | null
          owner_rep_name: string | null
          owner_rep_phone: string | null
          owner_tenant_type_preference: string | null
          parking_2w: Database["public"]["Enums"]["parking_availability"]
          parking_2w_count: number | null
          parking_4w: Database["public"]["Enums"]["parking_availability"]
          parking_4w_count: number | null
          parking_notes: string | null
          pet_policy: string | null
          pincode: string | null
          place_id: string | null
          plus_code: string | null
          possession_date: string | null
          possession_status: string | null
          price_negotiable: boolean | null
          property_tax_paid_upto: string | null
          property_type: string | null
          rent_brokerage_fixed_amount: number | null
          rent_brokerage_months: number | null
          rent_brokerage_type: string | null
          rera_registration_number: string | null
          route: string | null
          sale_brokerage_pct: number | null
          sale_listing_confirmed_at: string | null
          sale_price: number | null
          security_deposit_amount: number | null
          security_deposit_months: number
          society_maintenance_approx: number | null
          square_footage: number | null
          state: string | null
          status: Database["public"]["Enums"]["property_status"]
          street_address: string | null
          street_number: string | null
          streetview_available: boolean | null
          streetview_checked_at: string | null
          streetview_pano_id: string | null
          streetview_show_in_listing: boolean
          sublocality_1: string | null
          sublocality_2: string | null
          super_built_up_area: number | null
          title: string | null
          total_floors: number | null
          updated_at: string
          utility_electricity_included: boolean
          utility_gas_included: boolean
          utility_water_included: boolean
          vacancy_review_day14_at: string | null
          vacancy_review_day21_at: string | null
          viewport_ne_lat: number | null
          viewport_ne_lng: number | null
          viewport_sw_lat: number | null
          viewport_sw_lng: number | null
          water_source: string[] | null
          water_storage: string | null
          youtube_walkthrough_url: string | null
        }
        Insert: {
          address_mode?: string | null
          amenities?: Json | null
          annual_rent_increase_pct?: number | null
          auto_accept_enabled?: boolean
          availability_confirmed_at?: string | null
          available_from?: string | null
          balconies?: number | null
          bathrooms?: number | null
          bhk?: Database["public"]["Enums"]["bhk_type"] | null
          board_installed_at?: string | null
          board_qr_code?: string | null
          board_removed_at?: string | null
          board_status?: Database["public"]["Enums"]["board_status"]
          building_age_years?: number | null
          building_name?: string | null
          building_name_source?: string | null
          building_notes?: string | null
          building_rules?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          current_listed_period_started_at?: string | null
          description?: string | null
          discovery_confirmed_at?: string | null
          discovery_finalized_at?: string | null
          district?: string | null
          draft_at?: string | null
          expected_price_per_sqft?: number | null
          facing?: string | null
          flat_number?: string | null
          flat_number_revealed?: boolean
          floor_number?: number | null
          formatted_address?: string | null
          furnishing?: Database["public"]["Enums"]["furnishing_type"] | null
          furnishing_detail?: Json | null
          gas_type?: string | null
          geom_exact?: unknown
          google_maps_url?: string | null
          id?: string
          is_active?: boolean
          khata_type?: string | null
          landmark?: string | null
          last_public_listed_rent?: number | null
          last_public_sale_price?: number | null
          latitude?: number | null
          legal_owner_name?: string | null
          listed_at?: string | null
          listed_rent?: number
          lister_flat_number?: string | null
          lister_role: string
          listing_type?: Database["public"]["Enums"]["property_listing_type"]
          locality?: string | null
          location_confirmed_at?: string | null
          location_verified_at?: string | null
          location_verified_by_owner?: boolean
          lock_in_months?: number | null
          longitude?: number | null
          main_door_lock_type?: string | null
          maintenance_included_in_rent?: boolean
          move_in_charges_amount?: number | null
          neighborhood?: string | null
          notice_period_days?: number | null
          notice_period_months?: number | null
          owner_committed_12_months?: boolean | null
          owner_diet_preference?: string | null
          owner_has_local_rep?: boolean | null
          owner_id: string
          owner_income_dependent?: boolean | null
          owner_lives_in_same_city?: boolean | null
          owner_only_rental_property?: boolean | null
          owner_pet_preference?: string | null
          owner_pin_adjusted_at?: string | null
          owner_pin_adjustment_distance_m?: number | null
          owner_prefers_phone_calls?: boolean | null
          owner_rep_name?: string | null
          owner_rep_phone?: string | null
          owner_tenant_type_preference?: string | null
          parking_2w?: Database["public"]["Enums"]["parking_availability"]
          parking_2w_count?: number | null
          parking_4w?: Database["public"]["Enums"]["parking_availability"]
          parking_4w_count?: number | null
          parking_notes?: string | null
          pet_policy?: string | null
          pincode?: string | null
          place_id?: string | null
          plus_code?: string | null
          possession_date?: string | null
          possession_status?: string | null
          price_negotiable?: boolean | null
          property_tax_paid_upto?: string | null
          property_type?: string | null
          rent_brokerage_fixed_amount?: number | null
          rent_brokerage_months?: number | null
          rent_brokerage_type?: string | null
          rera_registration_number?: string | null
          route?: string | null
          sale_brokerage_pct?: number | null
          sale_listing_confirmed_at?: string | null
          sale_price?: number | null
          security_deposit_amount?: number | null
          security_deposit_months?: number
          society_maintenance_approx?: number | null
          square_footage?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          street_address?: string | null
          street_number?: string | null
          streetview_available?: boolean | null
          streetview_checked_at?: string | null
          streetview_pano_id?: string | null
          streetview_show_in_listing?: boolean
          sublocality_1?: string | null
          sublocality_2?: string | null
          super_built_up_area?: number | null
          title?: string | null
          total_floors?: number | null
          updated_at?: string
          utility_electricity_included?: boolean
          utility_gas_included?: boolean
          utility_water_included?: boolean
          vacancy_review_day14_at?: string | null
          vacancy_review_day21_at?: string | null
          viewport_ne_lat?: number | null
          viewport_ne_lng?: number | null
          viewport_sw_lat?: number | null
          viewport_sw_lng?: number | null
          water_source?: string[] | null
          water_storage?: string | null
          youtube_walkthrough_url?: string | null
        }
        Update: {
          address_mode?: string | null
          amenities?: Json | null
          annual_rent_increase_pct?: number | null
          auto_accept_enabled?: boolean
          availability_confirmed_at?: string | null
          available_from?: string | null
          balconies?: number | null
          bathrooms?: number | null
          bhk?: Database["public"]["Enums"]["bhk_type"] | null
          board_installed_at?: string | null
          board_qr_code?: string | null
          board_removed_at?: string | null
          board_status?: Database["public"]["Enums"]["board_status"]
          building_age_years?: number | null
          building_name?: string | null
          building_name_source?: string | null
          building_notes?: string | null
          building_rules?: string | null
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string
          current_listed_period_started_at?: string | null
          description?: string | null
          discovery_confirmed_at?: string | null
          discovery_finalized_at?: string | null
          district?: string | null
          draft_at?: string | null
          expected_price_per_sqft?: number | null
          facing?: string | null
          flat_number?: string | null
          flat_number_revealed?: boolean
          floor_number?: number | null
          formatted_address?: string | null
          furnishing?: Database["public"]["Enums"]["furnishing_type"] | null
          furnishing_detail?: Json | null
          gas_type?: string | null
          geom_exact?: unknown
          google_maps_url?: string | null
          id?: string
          is_active?: boolean
          khata_type?: string | null
          landmark?: string | null
          last_public_listed_rent?: number | null
          last_public_sale_price?: number | null
          latitude?: number | null
          legal_owner_name?: string | null
          listed_at?: string | null
          listed_rent?: number
          lister_flat_number?: string | null
          lister_role?: string
          listing_type?: Database["public"]["Enums"]["property_listing_type"]
          locality?: string | null
          location_confirmed_at?: string | null
          location_verified_at?: string | null
          location_verified_by_owner?: boolean
          lock_in_months?: number | null
          longitude?: number | null
          main_door_lock_type?: string | null
          maintenance_included_in_rent?: boolean
          move_in_charges_amount?: number | null
          neighborhood?: string | null
          notice_period_days?: number | null
          notice_period_months?: number | null
          owner_committed_12_months?: boolean | null
          owner_diet_preference?: string | null
          owner_has_local_rep?: boolean | null
          owner_id?: string
          owner_income_dependent?: boolean | null
          owner_lives_in_same_city?: boolean | null
          owner_only_rental_property?: boolean | null
          owner_pet_preference?: string | null
          owner_pin_adjusted_at?: string | null
          owner_pin_adjustment_distance_m?: number | null
          owner_prefers_phone_calls?: boolean | null
          owner_rep_name?: string | null
          owner_rep_phone?: string | null
          owner_tenant_type_preference?: string | null
          parking_2w?: Database["public"]["Enums"]["parking_availability"]
          parking_2w_count?: number | null
          parking_4w?: Database["public"]["Enums"]["parking_availability"]
          parking_4w_count?: number | null
          parking_notes?: string | null
          pet_policy?: string | null
          pincode?: string | null
          place_id?: string | null
          plus_code?: string | null
          possession_date?: string | null
          possession_status?: string | null
          price_negotiable?: boolean | null
          property_tax_paid_upto?: string | null
          property_type?: string | null
          rent_brokerage_fixed_amount?: number | null
          rent_brokerage_months?: number | null
          rent_brokerage_type?: string | null
          rera_registration_number?: string | null
          route?: string | null
          sale_brokerage_pct?: number | null
          sale_listing_confirmed_at?: string | null
          sale_price?: number | null
          security_deposit_amount?: number | null
          security_deposit_months?: number
          society_maintenance_approx?: number | null
          square_footage?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"]
          street_address?: string | null
          street_number?: string | null
          streetview_available?: boolean | null
          streetview_checked_at?: string | null
          streetview_pano_id?: string | null
          streetview_show_in_listing?: boolean
          sublocality_1?: string | null
          sublocality_2?: string | null
          super_built_up_area?: number | null
          title?: string | null
          total_floors?: number | null
          updated_at?: string
          utility_electricity_included?: boolean
          utility_gas_included?: boolean
          utility_water_included?: boolean
          vacancy_review_day14_at?: string | null
          vacancy_review_day21_at?: string | null
          viewport_ne_lat?: number | null
          viewport_ne_lng?: number | null
          viewport_sw_lat?: number | null
          viewport_sw_lng?: number | null
          water_source?: string[] | null
          water_storage?: string | null
          youtube_walkthrough_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          id: string
          is_public: boolean
          payload: Json
          property_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          created_at?: string
          id?: string
          is_public?: boolean
          payload?: Json
          property_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          id?: string
          is_public?: boolean
          payload?: Json
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activity_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_comments: {
        Row: {
          created_at: string
          depth: number
          hidden_reason: string | null
          id: string
          is_deleted: boolean
          like_count: number
          parent_comment_id: string | null
          property_id: string
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          depth?: number
          hidden_reason?: string | null
          id?: string
          is_deleted?: boolean
          like_count?: number
          parent_comment_id?: string | null
          property_id: string
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          depth?: number
          hidden_reason?: string | null
          id?: string
          is_deleted?: boolean
          like_count?: number
          parent_comment_id?: string | null
          property_id?: string
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "property_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_comments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_edit_requests: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          id: string
          owner_id: string
          payload: Json
          property_id: string
          rejection_reason: string | null
          rejection_reason_text: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          owner_id: string
          payload?: Json
          property_id: string
          rejection_reason?: string | null
          rejection_reason_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          payload?: Json
          property_id?: string
          rejection_reason?: string | null
          rejection_reason_text?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_edit_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_edit_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_edit_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_geo_associations: {
        Row: {
          confidence: string | null
          created_at: string
          distance_m: number | null
          evidence_type: string | null
          geo_place_id: string
          id: string
          is_primary: boolean
          property_id: string
          relationship: string | null
          source: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          distance_m?: number | null
          evidence_type?: string | null
          geo_place_id: string
          id?: string
          is_primary?: boolean
          property_id: string
          relationship?: string | null
          source: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          distance_m?: number | null
          evidence_type?: string | null
          geo_place_id?: string
          id?: string
          is_primary?: boolean
          property_id?: string
          relationship?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_geo_associations_geo_place_id_fkey"
            columns: ["geo_place_id"]
            isOneToOne: false
            referencedRelation: "geo_places"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_geo_associations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_floor_plan: boolean
          is_primary: boolean
          property_id: string
          section: string | null
          sort_order: number
          thumbnail_url: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_floor_plan?: boolean
          is_primary?: boolean
          property_id: string
          section?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_floor_plan?: boolean
          is_primary?: boolean
          property_id?: string
          section?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      property_inspections: {
        Row: {
          actual_date: string | null
          created_at: string
          general_observations: string | null
          id: string
          inspection_summary: Json | null
          inspector_notes: string | null
          inspector_user_id: string
          key_return_summary: Json | null
          media_drive_link: string | null
          mode: Database["public"]["Enums"]["inspection_mode"] | null
          owner_signed_off: boolean
          pbr_generated_at: string | null
          pre_existing_damages: Json | null
          property_id: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["inspection_status"]
          structural_observations: Json | null
          updated_at: string
          utilities_overview: Json | null
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          general_observations?: string | null
          id?: string
          inspection_summary?: Json | null
          inspector_notes?: string | null
          inspector_user_id: string
          key_return_summary?: Json | null
          media_drive_link?: string | null
          mode?: Database["public"]["Enums"]["inspection_mode"] | null
          owner_signed_off?: boolean
          pbr_generated_at?: string | null
          pre_existing_damages?: Json | null
          property_id: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          structural_observations?: Json | null
          updated_at?: string
          utilities_overview?: Json | null
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          general_observations?: string | null
          id?: string
          inspection_summary?: Json | null
          inspector_notes?: string | null
          inspector_user_id?: string
          key_return_summary?: Json | null
          media_drive_link?: string | null
          mode?: Database["public"]["Enums"]["inspection_mode"] | null
          owner_signed_off?: boolean
          pbr_generated_at?: string | null
          pre_existing_damages?: Json | null
          property_id?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["inspection_status"]
          structural_observations?: Json | null
          updated_at?: string
          utilities_overview?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "property_inspections_inspector_user_id_fkey"
            columns: ["inspector_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_service_enquiries: {
        Row: {
          based_in: string
          building_street: string | null
          created_at: string
          email: string | null
          id: string
          ip_city: string | null
          ip_country: string | null
          ip_latitude: number | null
          ip_longitude: number | null
          ip_postal_code: string | null
          ip_region: string | null
          ip_timezone: string | null
          locality_area: string
          name: string
          notes: string | null
          phone: string
          preferred_contact: string
          property_type: string
          rent_tds_check: Json | null
          request_ip: string | null
          sale_readiness: Json | null
          service_choice: string
          source_page: string
          status: string
        }
        Insert: {
          based_in: string
          building_street?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_city?: string | null
          ip_country?: string | null
          ip_latitude?: number | null
          ip_longitude?: number | null
          ip_postal_code?: string | null
          ip_region?: string | null
          ip_timezone?: string | null
          locality_area: string
          name: string
          notes?: string | null
          phone: string
          preferred_contact: string
          property_type: string
          rent_tds_check?: Json | null
          request_ip?: string | null
          sale_readiness?: Json | null
          service_choice: string
          source_page?: string
          status?: string
        }
        Update: {
          based_in?: string
          building_street?: string | null
          created_at?: string
          email?: string | null
          id?: string
          ip_city?: string | null
          ip_country?: string | null
          ip_latitude?: number | null
          ip_longitude?: number | null
          ip_postal_code?: string | null
          ip_region?: string | null
          ip_timezone?: string | null
          locality_area?: string
          name?: string
          notes?: string | null
          phone?: string
          preferred_contact?: string
          property_type?: string
          rent_tds_check?: Json | null
          request_ip?: string | null
          sale_readiness?: Json | null
          service_choice?: string
          source_page?: string
          status?: string
        }
        Relationships: []
      }
      property_views: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string | null
          viewed_date: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id?: string | null
          viewed_date?: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string | null
          viewed_date?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pseudonym_adjectives: {
        Row: {
          word: string
        }
        Insert: {
          word: string
        }
        Update: {
          word?: string
        }
        Relationships: []
      }
      pseudonym_nouns: {
        Row: {
          word: string
        }
        Insert: {
          word: string
        }
        Update: {
          word?: string
        }
        Relationships: []
      }
      rental_preferences: {
        Row: {
          age: number | null
          buying_purpose: string | null
          created_at: string | null
          diet_preference: string | null
          expected_stay_duration: string | null
          funding_stage: string | null
          gender: string | null
          has_pets: boolean | null
          id: string
          is_foreign_citizen: boolean | null
          marital_status: string | null
          move_in_by: string | null
          number_of_occupants: number | null
          occupation: string | null
          occupation_other: string | null
          pet_types: string[] | null
          preference_mode: string
          preferred_city: string | null
          preferred_localities: string[] | null
          purchase_timeline: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age?: number | null
          buying_purpose?: string | null
          created_at?: string | null
          diet_preference?: string | null
          expected_stay_duration?: string | null
          funding_stage?: string | null
          gender?: string | null
          has_pets?: boolean | null
          id?: string
          is_foreign_citizen?: boolean | null
          marital_status?: string | null
          move_in_by?: string | null
          number_of_occupants?: number | null
          occupation?: string | null
          occupation_other?: string | null
          pet_types?: string[] | null
          preference_mode?: string
          preferred_city?: string | null
          preferred_localities?: string[] | null
          purchase_timeline?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age?: number | null
          buying_purpose?: string | null
          created_at?: string | null
          diet_preference?: string | null
          expected_stay_duration?: string | null
          funding_stage?: string | null
          gender?: string | null
          has_pets?: boolean | null
          id?: string
          is_foreign_citizen?: boolean | null
          marital_status?: string | null
          move_in_by?: string | null
          number_of_occupants?: number | null
          occupation?: string | null
          occupation_other?: string | null
          pet_types?: string[] | null
          preference_mode?: string
          preferred_city?: string | null
          preferred_localities?: string[] | null
          purchase_timeline?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      search_location_preferences: {
        Row: {
          history: Json
          schema_version: number
          updated_at: string
          user_id: string
        }
        Insert: {
          history?: Json
          schema_version?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          history?: Json
          schema_version?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_provider: Database["public"]["Enums"]["auth_provider"]
          created_at: string
          email: string | null
          email_verified: boolean
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          phone_verified: boolean
          pseudonym: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          auth_provider?: Database["public"]["Enums"]["auth_provider"]
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          pseudonym?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          auth_provider?: Database["public"]["Enums"]["auth_provider"]
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          phone_verified?: boolean
          pseudonym?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _assert_final_discovery_valid: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      _build_rating_side_v2: {
        Args: {
          p_acc_den: number
          p_acc_pos: number
          p_prog_den: number
          p_prog_pos: number
          p_reach_den: number
          p_reach_pos: number
          p_resp_den: number
          p_resp_pos: number
          p_total: number
          p_trust_den: number
          p_trust_pos: number
        }
        Returns: Json
      }
      _geo_insert_aliases: {
        Args: { p_aliases: string[]; p_geo_place_id: string }
        Returns: undefined
      }
      admin_delete_comment: { Args: { p_comment_id: string }; Returns: Json }
      admin_delete_draft_property: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      admin_unhide_comment: { Args: { p_comment_id: string }; Returns: Json }
      apply_final_property_location: {
        Args: {
          p_actor_type: string
          p_actor_user_id: string
          p_final_associations: Json
          p_location: Json
          p_property_id: string
          p_streetview: Json
        }
        Returns: undefined
      }
      approve_edit_request: {
        Args: { p_edit_request_id: string }
        Returns: undefined
      }
      cancel_pending_edit_request: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      confirm_availability_of_rental: {
        Args: { p_property_id: string }
        Returns: {
          confirmed_at: string
          next_confirmation_at: string
          property_id: string
        }[]
      }
      confirm_property_discovery_geography: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      confirm_sale_listing: {
        Args: { p_property_id: string }
        Returns: {
          confirmed_at: string
          next_confirmation_at: string
          property_id: string
        }[]
      }
      delete_own_comment: { Args: { p_comment_id: string }; Returns: Json }
      delete_property_photo: {
        Args: { p_image_id: string }
        Returns: undefined
      }
      finalize_property_discovery_geography: {
        Args: { p_property_id: string }
        Returns: undefined
      }
      generate_pseudonym: { Args: never; Returns: string }
      get_admin_comment_report_details: {
        Args: { p_comment_id: string }
        Returns: {
          created_at: string
          notes: string
          reason: string
          report_id: string
          reporter_dismissed_count: number
          reporter_full_name: string
          reporter_id: string
          reporter_is_active: boolean
          reporter_is_property_owner: boolean
          reporter_lifetime_reports: number
          reporter_pseudonym: string
          reporter_reports_on_property: number
          reporter_upheld_count: number
          resolution: string
          resolved_at: string
        }[]
      }
      get_admin_comment_review_queue: {
        Args: {
          p_author_type?: string
          p_limit?: number
          p_offset?: number
          p_reason?: string
          p_search?: string
          p_sort?: string
        }
        Returns: {
          burst_seconds: number
          comment_created_at: string
          comment_id: string
          comment_text: string
          depth: number
          hidden_at: string
          is_reply: boolean
          lifetime_report_count: number
          open_report_count: number
          open_reports: Json
          owner_full_name: string
          owner_id: string
          owner_pseudonym: string
          parent_comment_id: string
          poster_full_name: string
          poster_id: string
          poster_is_active: boolean
          poster_is_owner: boolean
          poster_pseudonym: string
          property_building: string
          property_city: string
          property_id: string
          property_locality: string
          property_status: string
          total_count: number
        }[]
      }
      get_admin_comments_page: {
        Args: {
          p_author_type?: string
          p_limit?: number
          p_offset?: number
          p_property_status?: string
          p_report_bucket?: string
          p_search?: string
          p_sort?: string
          p_state?: string
        }
        Returns: {
          comment_created_at: string
          comment_id: string
          comment_text: string
          comment_updated_at: string
          is_reply: boolean
          open_report_count: number
          owner_full_name: string
          owner_id: string
          owner_pseudonym: string
          parent_comment_id: string
          poster_full_name: string
          poster_id: string
          poster_is_active: boolean
          poster_is_owner: boolean
          poster_pseudonym: string
          property_building: string
          property_city: string
          property_id: string
          property_locality: string
          property_status: string
          report_count: number
          state: string
          total_count: number
        }[]
      }
      get_admin_properties_page: {
        Args: {
          p_city?: string
          p_limit?: number
          p_listing_type?: string
          p_offset?: number
          p_search?: string
          p_sort?: string
          p_status?: string
        }
        Returns: {
          accepted_contact_requests: number
          bhk: string
          building_name: string
          city: string
          comment_count: number
          listed_at: string
          listed_rent: number
          listing_type: string
          locality: string
          owner_email: string
          owner_name: string
          owner_phone: string
          pending_contact_requests: number
          property_id: string
          rejected_contact_requests: number
          sale_price: number
          status: string
          total_contact_requests: number
          total_count: number
          updated_at: string
          view_count: number
        }[]
      }
      get_admin_property_cities: {
        Args: never
        Returns: {
          city: string
        }[]
      }
      get_admin_user_signals: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
        }
        Returns: {
          comment_reports_received: number
          comments_admin_deleted: number
          comments_auto_hidden: number
          comments_count: number
          distinct_properties_reported: number
          full_name: string
          is_active: boolean
          max_reports_single_property: number
          pseudonym: string
          reports_dismissed: number
          reports_filed: number
          reports_on_owned_property: number
          reports_upheld: number
          total_count: number
          user_id: string
        }[]
      }
      get_my_daily_request_remaining: { Args: never; Returns: number }
      get_my_rateable_interactions_v2: {
        Args: never
        Returns: {
          building_name: string
          contact_request_id: string
          counterparty_name: string
          counterparty_user_id: string
          i_am: string
          locality: string
          my_submitted: boolean
          property_id: string
          property_viewable: boolean
        }[]
      }
      get_owner_card: {
        Args: { p_property_id: string }
        Returns: {
          name: string
          profile_photo_url: string
        }[]
      }
      get_owner_response_rate: {
        Args: { p_owner_id: string }
        Returns: {
          all_time_handled: number
          all_time_rate: number
          all_time_responded: number
          last_7d_handled: number
          last_7d_rate: number
          last_7d_responded: number
        }[]
      }
      get_pending_ratings_for_me: {
        Args: never
        Returns: {
          building_name: string
          contact_request_id: string
          counterparty_name: string
          i_am: string
          locality: string
          other_submitted: boolean
          property_id: string
          window_closes_at: string
          window_opens_at: string
        }[]
      }
      get_pending_requests_for_digest: {
        Args: never
        Returns: {
          new_request_count: number
          new_requests: Json
          owner_email: string
          owner_name: string
          owner_user_id: string
        }[]
      }
      get_phone_fallback: { Args: { p_user_id: string }; Returns: string }
      get_property_comments: {
        Args: { p_cursor?: string; p_limit?: number; p_property_id: string }
        Returns: {
          badges: string[]
          comment_id: string
          created_at: string
          depth: number
          hidden_reason: string
          is_mine: boolean
          is_owner: boolean
          like_count: number
          liked_by_me: boolean
          parent_comment_id: string
          pseudonym: string
          real_name: string
          text: string
        }[]
      }
      get_property_counts: {
        Args: { p_property_ids: string[] }
        Returns: {
          comment_count: number
          property_id: string
          view_count: number
        }[]
      }
      get_property_public_stats: {
        Args: { p_property_id: string }
        Returns: Json
      }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          bio: string
          created_at: string
          email_verified: boolean
          full_name: string
          is_public: boolean
          phone_verified: boolean
          profile_photo_url: string
          user_id: string
        }[]
      }
      get_tenant_daily_request_count: {
        Args: { p_tenant_id: string }
        Returns: number
      }
      get_unanswered_comment_counts: {
        Args: { p_property_ids: string[] }
        Returns: {
          property_id: string
          unanswered_count: number
        }[]
      }
      get_user_rating_summary: { Args: { p_user_id: string }; Returns: Json }
      get_user_rating_summary_v2: { Args: { p_user_id: string }; Returns: Json }
      get_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_property_owner: { Args: { prop_id: string }; Returns: boolean }
      post_comment: {
        Args: {
          p_parent_comment_id?: string
          p_property_id: string
          p_text: string
        }
        Returns: {
          created_at: string
          depth: number
          hidden_reason: string | null
          id: string
          is_deleted: boolean
          like_count: number
          parent_comment_id: string | null
          property_id: string
          text: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "property_comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reeve_custom_building_amenities: {
        Args: { p_am: Json }
        Returns: string[]
      }
      reeve_custom_furnishing_names: { Args: { p_fd: Json }; Returns: string[] }
      reeve_geo_is_plausible: {
        Args: {
          p_bbox_ne_lat: number
          p_bbox_ne_lng: number
          p_bbox_sw_lat: number
          p_bbox_sw_lng: number
          p_center_lat: number
          p_center_lng: number
          p_kind: string
          p_lat: number
          p_lng: number
        }
        Returns: boolean
      }
      reeve_introduces_new_custom: {
        Args: { p_new_am: Json; p_new_fd: Json; p_old_am: Json; p_old_fd: Json }
        Returns: boolean
      }
      reeve_search_geo_by_ids: {
        Args: { p_ids: string[] }
        Returns: {
          display_name: string
          id: string
          kind: string
          parent_display_name: string
          parent_geo_place_id: string
          search_region_display_name: string
          search_region_id: string
          settlement_subtype: string
        }[]
      }
      reeve_search_geo_suggest: {
        Args: {
          p_kinds?: string[]
          p_limit?: number
          p_parent_geo_place_id?: string
          p_query: string
          p_search_region_id?: string
        }
        Returns: {
          display_name: string
          id: string
          kind: string
          parent_display_name: string
          parent_geo_place_id: string
          search_region_display_name: string
          search_region_id: string
          settlement_subtype: string
        }[]
      }
      reeve_search_property_ids_v2: {
        Args: { p_distance_km: number; p_geo_place_ids: string[] }
        Returns: string[]
      }
      reject_edit_request: {
        Args: {
          p_edit_request_id: string
          p_reason: string
          p_reason_text?: string
        }
        Returns: undefined
      }
      reject_property_listing: {
        Args: {
          p_property_id: string
          p_reason: string
          p_reason_text?: string
        }
        Returns: undefined
      }
      replace_property_discovery_geography: {
        Args: { p_associations: Json; p_property_id: string }
        Returns: undefined
      }
      report_comment: {
        Args: { p_comment_id: string; p_notes?: string; p_reason: string }
        Returns: Json
      }
      resolve_canonical_geo_place: {
        Args: {
          p_aliases?: string[]
          p_anchor_quality?: string
          p_display_name: string
          p_kind: string
          p_lat?: number
          p_lng?: number
          p_parent_geo_place_id?: string
          p_provider?: string
          p_provider_place_id?: string
          p_provider_type?: string
          p_search_region_id?: string
          p_settlement_subtype?: string
        }
        Returns: string
      }
      run_stale_listing_sweep: { Args: never; Returns: number }
      search_compact_properties_v3: {
        Args: {
          p_amenities?: string[]
          p_availability_confirmed_within_days?: number
          p_available_by?: string
          p_bhk?: string[]
          p_cursor_availability_confirmed_at?: string
          p_cursor_id?: string
          p_cursor_listed_at?: string
          p_cursor_price_amount?: number
          p_distance_km?: number
          p_furnishing?: string[]
          p_geo_place_ids?: string[]
          p_has_experience_feedback?: boolean
          p_has_video_walkthrough?: boolean
          p_khata_type?: string[]
          p_limit?: number
          p_listed_within_days?: number
          p_listing_type: Database["public"]["Enums"]["property_listing_type"]
          p_max_annual_increase?: number
          p_max_carpet_area?: number
          p_max_deposit?: number
          p_max_lock_in_months?: number
          p_max_move_in_charges?: number
          p_max_notice_days?: number
          p_max_price?: number
          p_max_rent_brokerage_fixed?: number
          p_max_sale_brokerage_pct?: number
          p_max_super_built_up?: number
          p_min_carpet_area?: number
          p_min_price?: number
          p_min_response_rate?: number
          p_min_super_built_up?: number
          p_negotiable?: boolean
          p_parking_2w?: string[]
          p_parking_4w?: string[]
          p_pet_policy?: string[]
          p_possession_before?: string
          p_possession_status?: string[]
          p_property_tax_paid?: boolean
          p_property_type?: string
          p_rera_disclosed?: boolean
          p_sort?: string
          p_zero_rent_brokerage?: boolean
        }
        Returns: {
          availability_confirmed_at: string
          bathrooms: number
          bhk: string
          building_age_years: number
          building_name: string
          carpet_area_sqft: number
          city: string
          experience_feedback: Json
          floor_number: number
          furnishing: string
          latitude: number
          listed_at: string
          lister_role: string
          listing_type: string
          locality: string
          location_mode: string
          lock_in_months: number
          longitude: number
          notice_period_days: number
          owner_id: string
          parking_2w: string
          parking_2w_count: number
          parking_4w: string
          parking_4w_count: number
          pet_policy: string
          photo_count: number
          possession_date: string
          possession_status: string
          price_amount: number
          price_kind: string
          price_negotiable: boolean
          primary_image_url: string
          property_id: string
          property_type: string
          rent_brokerage_fixed_amount: number
          rent_brokerage_months: number
          rent_brokerage_type: string
          response_handled_count: number
          response_rate_pct: number
          sale_brokerage_pct: number
          security_deposit_amount: number
          super_built_up_sqft: number
          total_count: number
          total_floors: number
          youtube_walkthrough_url: string
        }[]
      }
      set_primary_property_photo: {
        Args: { p_image_id: string }
        Returns: undefined
      }
      set_property_geo_associations: {
        Args: {
          p_actor_type: string
          p_actor_user_id: string
          p_associations: Json
          p_property_id: string
        }
        Returns: undefined
      }
      submit_property_edit_request: {
        Args: {
          p_field_changes: Json
          p_photo_changes: Json
          p_property_id: string
        }
        Returns: string
      }
      submit_rating: {
        Args: {
          p_contact_request_id: string
          p_q1: string
          p_q2: string
          p_q3: string
          p_review_text?: string
        }
        Returns: Json
      }
      submit_rating_v2: {
        Args: {
          p_accuracy: string
          p_contact_request_id: string
          p_progress: string
          p_reach: string
          p_respect: string
          p_trust: string
        }
        Returns: Json
      }
      sync_verified_phone_from_auth: {
        Args: { p_expected_phone: string; p_user_id: string }
        Returns: {
          expected_phone_matches: boolean
          status: string
          synced: boolean
        }[]
      }
      toggle_comment_like: { Args: { p_comment_id: string }; Returns: Json }
      touch_last_login: { Args: never; Returns: undefined }
      track_property_view: {
        Args: { p_property_id: string; p_visitor_id: string }
        Returns: undefined
      }
      update_profile_bio: { Args: { p_bio: string }; Returns: string }
      update_property_building_name: {
        Args: {
          p_actor_type: string
          p_actor_user_id: string
          p_building_name: string
          p_property_id: string
        }
        Returns: undefined
      }
      upsert_geo_place: {
        Args: {
          p_bbox_ne_lat?: number
          p_bbox_ne_lng?: number
          p_bbox_sw_lat?: number
          p_bbox_sw_lng?: number
          p_center_lat: number
          p_center_lng: number
          p_display_name: string
          p_kind: string
          p_place_id: string
        }
        Returns: string
      }
      validate_property_field_text: {
        Args: { p_field: string; p_text: string }
        Returns: string
      }
      validate_short_text: {
        Args: { p_max_length: number; p_text: string }
        Returns: string
      }
    }
    Enums: {
      appliance_condition:
        | "fully_functional"
        | "minor_issues"
        | "non_functional"
      appliance_ownership: "landlord" | "platform" | "tenant_owned"
      appliance_type:
        | "refrigerator"
        | "washing_machine"
        | "dryer"
        | "air_conditioner"
        | "geyser"
        | "microwave"
        | "stove_hob"
        | "exhaust_fan"
        | "ceiling_fan"
        | "dishwasher"
        | "water_purifier"
        | "tv"
        | "fire_extinguisher"
        | "other"
      auth_provider: "phone_otp" | "google" | "apple" | "email_otp"
      bhk_type: "1BHK" | "2BHK" | "3BHK" | "4BHK" | "5BHK_plus" | "studio"
      board_status:
        | "not_installed"
        | "installed"
        | "needs_replacement"
        | "removed"
      contact_request_decline_reason:
        | "preferences_dont_fit"
        | "property_currently_unavailable"
        | "prefer_to_wait"
        | "not_the_right_fit"
        | "property_no_longer_available"
      contact_request_status:
        | "pending"
        | "approved"
        | "declined"
        | "withdrawn"
        | "auto_cancelled"
      furnishing_type: "unfurnished" | "semi_furnished" | "fully_furnished"
      inspection_mode: "in_person" | "virtual"
      inspection_status: "scheduled" | "in_progress" | "completed"
      parking_availability: "none" | "covered" | "uncovered" | "both"
      property_listing_type: "rent" | "sale"
      property_status:
        | "draft"
        | "pending_review"
        | "changes_requested"
        | "listed"
        | "edit_pending_review"
        | "unlisted"
        | "archived"
      room_condition:
        | "good"
        | "minor_wear"
        | "moderate_damage"
        | "severe_damage"
      room_type:
        | "living_room"
        | "bedroom"
        | "kitchen"
        | "bathroom"
        | "balcony"
        | "utility"
        | "parking"
        | "common_area"
        | "other"
        | "pooja_room"
        | "study_room"
        | "home_office"
        | "servant_quarter"
        | "store_room"
        | "dining_room"
      user_role:
        | "tenant"
        | "owner"
        | "admin"
        | "super_admin"
        | "ops"
        | "finance"
        | "customer_care"
        | "field_team"
        | "user"
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
      appliance_condition: [
        "fully_functional",
        "minor_issues",
        "non_functional",
      ],
      appliance_ownership: ["landlord", "platform", "tenant_owned"],
      appliance_type: [
        "refrigerator",
        "washing_machine",
        "dryer",
        "air_conditioner",
        "geyser",
        "microwave",
        "stove_hob",
        "exhaust_fan",
        "ceiling_fan",
        "dishwasher",
        "water_purifier",
        "tv",
        "fire_extinguisher",
        "other",
      ],
      auth_provider: ["phone_otp", "google", "apple", "email_otp"],
      bhk_type: ["1BHK", "2BHK", "3BHK", "4BHK", "5BHK_plus", "studio"],
      board_status: [
        "not_installed",
        "installed",
        "needs_replacement",
        "removed",
      ],
      contact_request_decline_reason: [
        "preferences_dont_fit",
        "property_currently_unavailable",
        "prefer_to_wait",
        "not_the_right_fit",
        "property_no_longer_available",
      ],
      contact_request_status: [
        "pending",
        "approved",
        "declined",
        "withdrawn",
        "auto_cancelled",
      ],
      furnishing_type: ["unfurnished", "semi_furnished", "fully_furnished"],
      inspection_mode: ["in_person", "virtual"],
      inspection_status: ["scheduled", "in_progress", "completed"],
      parking_availability: ["none", "covered", "uncovered", "both"],
      property_listing_type: ["rent", "sale"],
      property_status: [
        "draft",
        "pending_review",
        "changes_requested",
        "listed",
        "edit_pending_review",
        "unlisted",
        "archived",
      ],
      room_condition: [
        "good",
        "minor_wear",
        "moderate_damage",
        "severe_damage",
      ],
      room_type: [
        "living_room",
        "bedroom",
        "kitchen",
        "bathroom",
        "balcony",
        "utility",
        "parking",
        "common_area",
        "other",
        "pooja_room",
        "study_room",
        "home_office",
        "servant_quarter",
        "store_room",
        "dining_room",
      ],
      user_role: [
        "tenant",
        "owner",
        "admin",
        "super_admin",
        "ops",
        "finance",
        "customer_care",
        "field_team",
        "user",
      ],
    },
  },
} as const
