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
      agreements: {
        Row: {
          agency_signed_at: string | null
          agency_user_id: string
          agreement_type: Database["public"]["Enums"]["agreement_type"]
          created_at: string
          document_id: string | null
          end_date: string | null
          esign_provider: string | null
          esign_reference: string | null
          estamp_amount: number | null
          estamp_procured_at: string | null
          estamp_reference: string | null
          id: string
          lock_in_months: number | null
          monthly_rent: number | null
          notice_period_months: number | null
          owner_id: string
          owner_signed_at: string | null
          property_id: string
          requires_witnesses: boolean
          service_fee_pct: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["agreement_status"]
          tenant_id: string | null
          tenant_signed_at: string | null
          updated_at: string
          witness1_name: string | null
          witness1_signed_at: string | null
          witness2_name: string | null
          witness2_signed_at: string | null
        }
        Insert: {
          agency_signed_at?: string | null
          agency_user_id: string
          agreement_type: Database["public"]["Enums"]["agreement_type"]
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          esign_provider?: string | null
          esign_reference?: string | null
          estamp_amount?: number | null
          estamp_procured_at?: string | null
          estamp_reference?: string | null
          id?: string
          lock_in_months?: number | null
          monthly_rent?: number | null
          notice_period_months?: number | null
          owner_id: string
          owner_signed_at?: string | null
          property_id: string
          requires_witnesses?: boolean
          service_fee_pct?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["agreement_status"]
          tenant_id?: string | null
          tenant_signed_at?: string | null
          updated_at?: string
          witness1_name?: string | null
          witness1_signed_at?: string | null
          witness2_name?: string | null
          witness2_signed_at?: string | null
        }
        Update: {
          agency_signed_at?: string | null
          agency_user_id?: string
          agreement_type?: Database["public"]["Enums"]["agreement_type"]
          created_at?: string
          document_id?: string | null
          end_date?: string | null
          esign_provider?: string | null
          esign_reference?: string | null
          estamp_amount?: number | null
          estamp_procured_at?: string | null
          estamp_reference?: string | null
          id?: string
          lock_in_months?: number | null
          monthly_rent?: number | null
          notice_period_months?: number | null
          owner_id?: string
          owner_signed_at?: string | null
          property_id?: string
          requires_witnesses?: boolean
          service_fee_pct?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["agreement_status"]
          tenant_id?: string | null
          tenant_signed_at?: string | null
          updated_at?: string
          witness1_name?: string | null
          witness1_signed_at?: string | null
          witness2_name?: string | null
          witness2_signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_agency_user_id_fkey"
            columns: ["agency_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agreements_agency_user_id_fkey"
            columns: ["agency_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agreements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "agreements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          application_id: string
          created_at: string
          description: string
          id: string
          note_type: string
          photo_url: string | null
          resolved: boolean
        }
        Insert: {
          application_id: string
          created_at?: string
          description: string
          id?: string
          note_type: string
          photo_url?: string | null
          resolved?: boolean
        }
        Update: {
          application_id?: string
          created_at?: string
          description?: string
          id?: string
          note_type?: string
          photo_url?: string | null
          resolved?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_residents: {
        Row: {
          age: number
          application_id: string
          created_at: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          occupation: Database["public"]["Enums"]["occupation_type"] | null
          relationship: string
        }
        Insert: {
          age: number
          application_id: string
          created_at?: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          occupation?: Database["public"]["Enums"]["occupation_type"] | null
          relationship: string
        }
        Update: {
          age?: number
          application_id?: string
          created_at?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          occupation?: Database["public"]["Enums"]["occupation_type"] | null
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_residents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          attempt_number: number
          cibil_range: Database["public"]["Enums"]["cibil_range_type"] | null
          created_at: string
          crime_record_self_attest: boolean
          eligibility_id: string | null
          employer_name: string | null
          expired_at: string | null
          final_agreed_rent: number | null
          id: string
          id_verification_done: boolean
          income_check_passed: boolean | null
          kyc_completed_at: string | null
          linkedin_url: string | null
          monthly_income: number | null
          move_in_asap: boolean | null
          owner_action_by_admin: boolean | null
          owner_actioned_at: string | null
          owner_counter_rent: number | null
          platform_approved: boolean | null
          platform_rejected_at: string | null
          platform_rejection_reason: string | null
          platform_review_notes: string | null
          pre_hold_status:
            | Database["public"]["Enums"]["application_status"]
            | null
          preferred_move_in_date: string | null
          previous_application_id: string | null
          property_id: string
          property_notes_text: string | null
          proposed_rent: number
          reapplication_eligible_from: string | null
          rejection_reason: string | null
          service_fee_terms_confirmed: boolean
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          tds_applicable: boolean
          tenant_id: string
          updated_at: string
          visit_id: string | null
          withdrawal_reason: string | null
          withdrawn_at: string | null
          work_email: string | null
        }
        Insert: {
          attempt_number?: number
          cibil_range?: Database["public"]["Enums"]["cibil_range_type"] | null
          created_at?: string
          crime_record_self_attest?: boolean
          eligibility_id?: string | null
          employer_name?: string | null
          expired_at?: string | null
          final_agreed_rent?: number | null
          id?: string
          id_verification_done?: boolean
          income_check_passed?: boolean | null
          kyc_completed_at?: string | null
          linkedin_url?: string | null
          monthly_income?: number | null
          move_in_asap?: boolean | null
          owner_action_by_admin?: boolean | null
          owner_actioned_at?: string | null
          owner_counter_rent?: number | null
          platform_approved?: boolean | null
          platform_rejected_at?: string | null
          platform_rejection_reason?: string | null
          platform_review_notes?: string | null
          pre_hold_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          preferred_move_in_date?: string | null
          previous_application_id?: string | null
          property_id: string
          property_notes_text?: string | null
          proposed_rent: number
          reapplication_eligible_from?: string | null
          rejection_reason?: string | null
          service_fee_terms_confirmed?: boolean
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          tds_applicable?: boolean
          tenant_id: string
          updated_at?: string
          visit_id?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
          work_email?: string | null
        }
        Update: {
          attempt_number?: number
          cibil_range?: Database["public"]["Enums"]["cibil_range_type"] | null
          created_at?: string
          crime_record_self_attest?: boolean
          eligibility_id?: string | null
          employer_name?: string | null
          expired_at?: string | null
          final_agreed_rent?: number | null
          id?: string
          id_verification_done?: boolean
          income_check_passed?: boolean | null
          kyc_completed_at?: string | null
          linkedin_url?: string | null
          monthly_income?: number | null
          move_in_asap?: boolean | null
          owner_action_by_admin?: boolean | null
          owner_actioned_at?: string | null
          owner_counter_rent?: number | null
          platform_approved?: boolean | null
          platform_rejected_at?: string | null
          platform_rejection_reason?: string | null
          platform_review_notes?: string | null
          pre_hold_status?:
            | Database["public"]["Enums"]["application_status"]
            | null
          preferred_move_in_date?: string | null
          previous_application_id?: string | null
          property_id?: string
          property_notes_text?: string | null
          proposed_rent?: number
          reapplication_eligible_from?: string | null
          rejection_reason?: string | null
          service_fee_terms_confirmed?: boolean
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          tds_applicable?: boolean
          tenant_id?: string
          updated_at?: string
          visit_id?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_eligibility_id_fkey"
            columns: ["eligibility_id"]
            isOneToOne: false
            referencedRelation: "eligibility"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_previous_application_id_fkey"
            columns: ["previous_application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "callback_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callback_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
      comment_reports: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          notes: string | null
          reason: string
          reporter_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reason: string
          reporter_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string
          reporter_id?: string
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "comment_reports_reporter_id_fkey"
            columns: ["reporter_id"]
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "contact_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
      documents: {
        Row: {
          application_id: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at: string
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date: string | null
          file_name: string
          file_size_bytes: number | null
          file_url: string
          id: string
          is_mandatory: boolean
          is_verified: boolean
          lease_id: string | null
          mime_type: string | null
          owner_user_id: string
          property_id: string | null
          submitted_at: string | null
          updated_at: string
          uploaded_by: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          application_id?: string | null
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string
          document_type: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          file_name: string
          file_size_bytes?: number | null
          file_url: string
          id?: string
          is_mandatory?: boolean
          is_verified?: boolean
          lease_id?: string | null
          mime_type?: string | null
          owner_user_id: string
          property_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          uploaded_by: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          application_id?: string | null
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string
          document_type?: Database["public"]["Enums"]["document_type"]
          expiry_date?: string | null
          file_name?: string
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          is_mandatory?: boolean
          is_verified?: boolean
          lease_id?: string | null
          mime_type?: string | null
          owner_user_id?: string
          property_id?: string | null
          submitted_at?: string | null
          updated_at?: string
          uploaded_by?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility: {
        Row: {
          age: number
          created_at: string
          diet: Database["public"]["Enums"]["diet_type"] | null
          disqualification_reason: string | null
          expected_stay: Database["public"]["Enums"]["stay_duration_type"]
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          has_pets: boolean
          id: string
          is_foreign_citizen: boolean
          marital_status: Database["public"]["Enums"]["marital_status"]
          occupation: Database["public"]["Enums"]["occupation_type"]
          pet_description: string | null
          pet_type: Database["public"]["Enums"]["pet_type"] | null
          resident_count: number
          reviewed_at: string | null
          status: Database["public"]["Enums"]["eligibility_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          age: number
          created_at?: string
          diet?: Database["public"]["Enums"]["diet_type"] | null
          disqualification_reason?: string | null
          expected_stay: Database["public"]["Enums"]["stay_duration_type"]
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"]
          has_pets?: boolean
          id?: string
          is_foreign_citizen?: boolean
          marital_status: Database["public"]["Enums"]["marital_status"]
          occupation: Database["public"]["Enums"]["occupation_type"]
          pet_description?: string | null
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          resident_count: number
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["eligibility_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number
          created_at?: string
          diet?: Database["public"]["Enums"]["diet_type"] | null
          disqualification_reason?: string | null
          expected_stay?: Database["public"]["Enums"]["stay_duration_type"]
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"]
          has_pets?: boolean
          id?: string
          is_foreign_citizen?: boolean
          marital_status?: Database["public"]["Enums"]["marital_status"]
          occupation?: Database["public"]["Enums"]["occupation_type"]
          pet_description?: string | null
          pet_type?: Database["public"]["Enums"]["pet_type"] | null
          resident_count?: number
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["eligibility_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "eligibility_user_id_fkey"
            columns: ["user_id"]
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
      external_queries: {
        Row: {
          assigned_to: string | null
          category: Database["public"]["Enums"]["external_query_category"]
          created_at: string
          description: string
          id: string
          phone_otp_verified: boolean
          photo_urls: string[] | null
          property_id: string
          reporter_email: string | null
          reporter_name: string
          reporter_org_flat: string | null
          reporter_phone: string
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["external_query_status"]
          submitted_at: string
          tenant_looped_in: boolean
          updated_at: string
          whatsapp_initiated: boolean
        }
        Insert: {
          assigned_to?: string | null
          category: Database["public"]["Enums"]["external_query_category"]
          created_at?: string
          description: string
          id?: string
          phone_otp_verified?: boolean
          photo_urls?: string[] | null
          property_id: string
          reporter_email?: string | null
          reporter_name: string
          reporter_org_flat?: string | null
          reporter_phone: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["external_query_status"]
          submitted_at?: string
          tenant_looped_in?: boolean
          updated_at?: string
          whatsapp_initiated?: boolean
        }
        Update: {
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["external_query_category"]
          created_at?: string
          description?: string
          id?: string
          phone_otp_verified?: boolean
          photo_urls?: string[] | null
          property_id?: string
          reporter_email?: string | null
          reporter_name?: string
          reporter_org_flat?: string | null
          reporter_phone?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["external_query_status"]
          submitted_at?: string
          tenant_looped_in?: boolean
          updated_at?: string
          whatsapp_initiated?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "external_queries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "external_queries_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_queries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_queries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
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
            foreignKeyName: "favourites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favourites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
          {
            foreignKeyName: "inspection_callbacks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
          o_q1_communication: string | null
          o_q2_visit: string | null
          o_q3_deal_again: string | null
          o_review_text: string | null
          o_submitted_at: string | null
          owner_id: string
          property_id: string
          t_q1_communication: string | null
          t_q2_visit: string | null
          t_q3_deal_again: string | null
          t_review_text: string | null
          t_submitted_at: string | null
          tenant_id: string
          updated_at: string
          window_closes_at: string
          window_opens_at: string
        }
        Insert: {
          contact_request_id: string
          created_at?: string
          id?: string
          o_q1_communication?: string | null
          o_q2_visit?: string | null
          o_q3_deal_again?: string | null
          o_review_text?: string | null
          o_submitted_at?: string | null
          owner_id: string
          property_id: string
          t_q1_communication?: string | null
          t_q2_visit?: string | null
          t_q3_deal_again?: string | null
          t_review_text?: string | null
          t_submitted_at?: string | null
          tenant_id: string
          updated_at?: string
          window_closes_at: string
          window_opens_at: string
        }
        Update: {
          contact_request_id?: string
          created_at?: string
          id?: string
          o_q1_communication?: string | null
          o_q2_visit?: string | null
          o_q3_deal_again?: string | null
          o_review_text?: string | null
          o_submitted_at?: string | null
          owner_id?: string
          property_id?: string
          t_q1_communication?: string | null
          t_q2_visit?: string | null
          t_q3_deal_again?: string | null
          t_review_text?: string | null
          t_submitted_at?: string | null
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "interaction_ratings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interaction_ratings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
      keys_tracking: {
        Row: {
          created_at: string
          created_by: string
          event: Database["public"]["Enums"]["key_event_type"]
          from_holder: Database["public"]["Enums"]["key_holder_type"] | null
          held_by_user_id: string | null
          id: string
          keys_transferred: number
          keys_with_owner: number
          keys_with_platform: number
          keys_with_tenant: number
          keys_with_vendor: number
          lease_id: string | null
          maintenance_id: string | null
          notes: string | null
          property_id: string
          purpose: string | null
          replacement_cost: number | null
          sign_off_at: string | null
          signed_off_by: string | null
          to_holder: Database["public"]["Enums"]["key_holder_type"] | null
          total_keys: number
        }
        Insert: {
          created_at?: string
          created_by: string
          event: Database["public"]["Enums"]["key_event_type"]
          from_holder?: Database["public"]["Enums"]["key_holder_type"] | null
          held_by_user_id?: string | null
          id?: string
          keys_transferred?: number
          keys_with_owner?: number
          keys_with_platform?: number
          keys_with_tenant?: number
          keys_with_vendor?: number
          lease_id?: string | null
          maintenance_id?: string | null
          notes?: string | null
          property_id: string
          purpose?: string | null
          replacement_cost?: number | null
          sign_off_at?: string | null
          signed_off_by?: string | null
          to_holder?: Database["public"]["Enums"]["key_holder_type"] | null
          total_keys?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          event?: Database["public"]["Enums"]["key_event_type"]
          from_holder?: Database["public"]["Enums"]["key_holder_type"] | null
          held_by_user_id?: string | null
          id?: string
          keys_transferred?: number
          keys_with_owner?: number
          keys_with_platform?: number
          keys_with_tenant?: number
          keys_with_vendor?: number
          lease_id?: string | null
          maintenance_id?: string | null
          notes?: string | null
          property_id?: string
          purpose?: string | null
          replacement_cost?: number | null
          sign_off_at?: string | null
          signed_off_by?: string | null
          to_holder?: Database["public"]["Enums"]["key_holder_type"] | null
          total_keys?: number
        }
        Relationships: [
          {
            foreignKeyName: "keys_tracking_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "keys_tracking_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_tracking_held_by_user_id_fkey"
            columns: ["held_by_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "keys_tracking_held_by_user_id_fkey"
            columns: ["held_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_tracking_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_tracking_maintenance_id_fkey"
            columns: ["maintenance_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_tracking_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_tracking_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keys_tracking_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "keys_tracking_signed_off_by_fkey"
            columns: ["signed_off_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          bhk: Database["public"]["Enums"]["bhk_type"] | null
          building_name: string | null
          city: string | null
          contact_attempts: number
          contacted_at: string | null
          converted_property_id: string | null
          created_at: string
          dropped_reason: string | null
          expected_rent: number | null
          flat_number: string | null
          follow_up_at: string | null
          follow_up_date: string | null
          id: string
          last_contacted_at: string | null
          locality: string | null
          notes: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string
          property_address: string | null
          referred_by_tenant_id: string | null
          referrer_name: string | null
          referrer_phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          tenant_notified_on_listing: boolean
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          bhk?: Database["public"]["Enums"]["bhk_type"] | null
          building_name?: string | null
          city?: string | null
          contact_attempts?: number
          contacted_at?: string | null
          converted_property_id?: string | null
          created_at?: string
          dropped_reason?: string | null
          expected_rent?: number | null
          flat_number?: string | null
          follow_up_at?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          locality?: string | null
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone: string
          property_address?: string | null
          referred_by_tenant_id?: string | null
          referrer_name?: string | null
          referrer_phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_notified_on_listing?: boolean
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          bhk?: Database["public"]["Enums"]["bhk_type"] | null
          building_name?: string | null
          city?: string | null
          contact_attempts?: number
          contacted_at?: string | null
          converted_property_id?: string | null
          created_at?: string
          dropped_reason?: string | null
          expected_rent?: number | null
          flat_number?: string | null
          follow_up_at?: string | null
          follow_up_date?: string | null
          id?: string
          last_contacted_at?: string | null
          locality?: string | null
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string
          property_address?: string | null
          referred_by_tenant_id?: string | null
          referrer_name?: string | null
          referrer_phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_notified_on_listing?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_property_id_fkey"
            columns: ["converted_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_property_id_fkey"
            columns: ["converted_property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_referred_by_tenant_id_fkey"
            columns: ["referred_by_tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_referred_by_tenant_id_fkey"
            columns: ["referred_by_tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          agreement_id: string | null
          application_id: string
          created_at: string
          electricity_compliance: Database["public"]["Enums"]["bill_compliance_status"]
          enach_activated_at: string | null
          enach_active: boolean
          enach_mandate_id: string | null
          end_date: string
          gas_compliance: Database["public"]["Enums"]["bill_compliance_status"]
          gst_pct: number
          id: string
          last_bill_check_at: string | null
          lock_in_end_date: string
          monthly_rent: number
          move_in_date: string | null
          move_out_date: string | null
          move_out_initiated_at: string | null
          next_bill_check_at: string | null
          notice_period_months: number
          notice_served_at: string | null
          owner_id: string
          parent_lease_id: string | null
          property_id: string
          renewal_count: number
          security_deposit_amount: number
          service_fee_pct: number
          society_maintenance_compliance: Database["public"]["Enums"]["bill_compliance_status"]
          start_date: string
          status: Database["public"]["Enums"]["lease_status"]
          tds_applicable: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          agreement_id?: string | null
          application_id: string
          created_at?: string
          electricity_compliance?: Database["public"]["Enums"]["bill_compliance_status"]
          enach_activated_at?: string | null
          enach_active?: boolean
          enach_mandate_id?: string | null
          end_date: string
          gas_compliance?: Database["public"]["Enums"]["bill_compliance_status"]
          gst_pct?: number
          id?: string
          last_bill_check_at?: string | null
          lock_in_end_date: string
          monthly_rent: number
          move_in_date?: string | null
          move_out_date?: string | null
          move_out_initiated_at?: string | null
          next_bill_check_at?: string | null
          notice_period_months?: number
          notice_served_at?: string | null
          owner_id: string
          parent_lease_id?: string | null
          property_id: string
          renewal_count?: number
          security_deposit_amount: number
          service_fee_pct?: number
          society_maintenance_compliance?: Database["public"]["Enums"]["bill_compliance_status"]
          start_date: string
          status?: Database["public"]["Enums"]["lease_status"]
          tds_applicable?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          agreement_id?: string | null
          application_id?: string
          created_at?: string
          electricity_compliance?: Database["public"]["Enums"]["bill_compliance_status"]
          enach_activated_at?: string | null
          enach_active?: boolean
          enach_mandate_id?: string | null
          end_date?: string
          gas_compliance?: Database["public"]["Enums"]["bill_compliance_status"]
          gst_pct?: number
          id?: string
          last_bill_check_at?: string | null
          lock_in_end_date?: string
          monthly_rent?: number
          move_in_date?: string | null
          move_out_date?: string | null
          move_out_initiated_at?: string | null
          next_bill_check_at?: string | null
          notice_period_months?: number
          notice_served_at?: string | null
          owner_id?: string
          parent_lease_id?: string | null
          property_id?: string
          renewal_count?: number
          security_deposit_amount?: number
          service_fee_pct?: number
          society_maintenance_compliance?: Database["public"]["Enums"]["bill_compliance_status"]
          start_date?: string
          status?: Database["public"]["Enums"]["lease_status"]
          tds_applicable?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leases_agreement_id"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_parent_lease_id_fkey"
            columns: ["parent_lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["maintenance_category"]
          closed_at: string | null
          created_at: string
          damage_cost: number | null
          description: string
          id: string
          is_emergency: boolean
          lease_id: string
          photo_urls: string[] | null
          property_id: string
          raised_by: string
          resolution_notes: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          submitted_at: string
          tenant_disputed: boolean
          updated_at: string
          wear_vs_damage: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          category: Database["public"]["Enums"]["maintenance_category"]
          closed_at?: string | null
          created_at?: string
          damage_cost?: number | null
          description: string
          id?: string
          is_emergency?: boolean
          lease_id: string
          photo_urls?: string[] | null
          property_id: string
          raised_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          submitted_at?: string
          tenant_disputed?: boolean
          updated_at?: string
          wear_vs_damage?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["maintenance_category"]
          closed_at?: string | null
          created_at?: string
          damage_cost?: number | null
          description?: string
          id?: string
          is_emergency?: boolean
          lease_id?: string
          photo_urls?: string[] | null
          property_id?: string
          raised_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          submitted_at?: string
          tenant_disputed?: boolean
          updated_at?: string
          wear_vs_damage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "maintenance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "maintenance_requests_raised_by_fkey"
            columns: ["raised_by"]
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
      owner_action_log: {
        Row: {
          action_taken: string
          application_id: string
          confirmed_via: string
          conversation_at: string
          counter_rent: number | null
          created_at: string
          id: string
          rejection_reason: string | null
          summary: string
          team_member_id: string
        }
        Insert: {
          action_taken: string
          application_id: string
          confirmed_via: string
          conversation_at: string
          counter_rent?: number | null
          created_at?: string
          id?: string
          rejection_reason?: string | null
          summary: string
          team_member_id: string
        }
        Update: {
          action_taken?: string
          application_id?: string
          confirmed_via?: string
          conversation_at?: string
          counter_rent?: number | null
          created_at?: string
          id?: string
          rejection_reason?: string | null
          summary?: string
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_action_log_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_action_log_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_action_log_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_bank_details: {
        Row: {
          account_number: string
          account_type: string
          bank_name: string
          created_at: string
          id: string
          ifsc_code: string
          is_verified: boolean
          owner_id: string
          updated_at: string
        }
        Insert: {
          account_number: string
          account_type: string
          bank_name: string
          created_at?: string
          id?: string
          ifsc_code: string
          is_verified?: boolean
          owner_id: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_type?: string
          bank_name?: string
          created_at?: string
          id?: string
          ifsc_code?: string
          is_verified?: boolean
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_bank_details_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "owner_bank_details_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          application_id: string | null
          billing_month: string | null
          created_at: string
          currency: string
          enach_debit_date: string | null
          failure_reason: string | null
          gateway_reference: string | null
          gateway_response: Json | null
          gst_component: number | null
          id: string
          lease_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          payee_id: string | null
          payer_id: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          refund_reason: string | null
          refunded_at: string | null
          rent_component: number | null
          retry_count: number
          service_fee_component: number | null
          status: Database["public"]["Enums"]["payment_status"]
          tds_deducted: number | null
          updated_at: string
        }
        Insert: {
          amount: number
          application_id?: string | null
          billing_month?: string | null
          created_at?: string
          currency?: string
          enach_debit_date?: string | null
          failure_reason?: string | null
          gateway_reference?: string | null
          gateway_response?: Json | null
          gst_component?: number | null
          id?: string
          lease_id?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          payee_id?: string | null
          payer_id: string
          payment_type: Database["public"]["Enums"]["payment_type"]
          refund_reason?: string | null
          refunded_at?: string | null
          rent_component?: number | null
          retry_count?: number
          service_fee_component?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          tds_deducted?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number
          application_id?: string | null
          billing_month?: string | null
          created_at?: string
          currency?: string
          enach_debit_date?: string | null
          failure_reason?: string | null
          gateway_reference?: string | null
          gateway_response?: Json | null
          gst_component?: number | null
          id?: string
          lease_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          payee_id?: string | null
          payer_id?: string
          payment_type?: Database["public"]["Enums"]["payment_type"]
          refund_reason?: string | null
          refunded_at?: string | null
          rent_component?: number | null
          retry_count?: number
          service_fee_component?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          tds_deducted?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_payee_id_fkey"
            columns: ["payee_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aadhaar_last4: string | null
          aadhaar_number: string | null
          admin_notes: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bio: string | null
          created_at: string
          date_of_birth: string | null
          diet: Database["public"]["Enums"]["diet_type"] | null
          display_name: string | null
          emergency_contact_email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          has_pets: boolean | null
          id: string
          is_foreign_citizen: boolean
          is_public: boolean
          kyc_verified: boolean
          kyc_verified_at: string | null
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          no_show_count: number
          occupation: Database["public"]["Enums"]["occupation_type"] | null
          pan_number: string | null
          pet_details: string | null
          profile_photo_url: string | null
          screening_opt_out: boolean
          updated_at: string
          user_id: string
          visit_priority_low: boolean
          visit_scheduling_blocked: boolean
        }
        Insert: {
          aadhaar_last4?: string | null
          aadhaar_number?: string | null
          admin_notes?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          diet?: Database["public"]["Enums"]["diet_type"] | null
          display_name?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          has_pets?: boolean | null
          id?: string
          is_foreign_citizen?: boolean
          is_public?: boolean
          kyc_verified?: boolean
          kyc_verified_at?: string | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          no_show_count?: number
          occupation?: Database["public"]["Enums"]["occupation_type"] | null
          pan_number?: string | null
          pet_details?: string | null
          profile_photo_url?: string | null
          screening_opt_out?: boolean
          updated_at?: string
          user_id: string
          visit_priority_low?: boolean
          visit_scheduling_blocked?: boolean
        }
        Update: {
          aadhaar_last4?: string | null
          aadhaar_number?: string | null
          admin_notes?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          diet?: Database["public"]["Enums"]["diet_type"] | null
          display_name?: string | null
          emergency_contact_email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          has_pets?: boolean | null
          id?: string
          is_foreign_citizen?: boolean
          is_public?: boolean
          kyc_verified?: boolean
          kyc_verified_at?: string | null
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          no_show_count?: number
          occupation?: Database["public"]["Enums"]["occupation_type"] | null
          pan_number?: string | null
          pet_details?: string | null
          profile_photo_url?: string | null
          screening_opt_out?: boolean
          updated_at?: string
          user_id?: string
          visit_priority_low?: boolean
          visit_scheduling_blocked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
          agreement_pending_at: string | null
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
          building_name: string
          building_notes: string | null
          building_rules: string | null
          city: string | null
          country: string | null
          created_at: string
          current_listed_period_started_at: string | null
          description: string | null
          district: string | null
          draft_at: string | null
          expected_price_per_sqft: number | null
          facing: string | null
          flat_number: string | null
          flat_number_revealed: boolean
          floor_number: number | null
          floor_plan_url: string | null
          formatted_address: string | null
          furnishing: Database["public"]["Enums"]["furnishing_type"] | null
          furnishing_detail: Json | null
          gas_type: string | null
          google_maps_url: string | null
          id: string
          inspected_at: string | null
          inspection_accepted_at: string | null
          inspection_date: string | null
          inspection_end_time: string | null
          inspection_notes: string | null
          inspection_proposed_at: string | null
          inspection_scheduled_at: string | null
          inspection_start_time: string | null
          is_active: boolean
          khata_type: string | null
          landmark: string | null
          last_leased_at: string | null
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
          location_verified_at: string | null
          location_verified_by_owner: boolean
          lock_in_months: number | null
          longitude: number | null
          main_door_lock_type: string | null
          maintenance_included_in_rent: boolean
          map_pin_url: string | null
          move_in_charges_amount: number | null
          neighborhood: string | null
          notice_period_days: number | null
          notice_period_months: number | null
          occupied_at: string | null
          off_market_at: string | null
          owner_committed_12_months: boolean | null
          owner_diet_preference: string | null
          owner_has_local_rep: boolean | null
          owner_id: string
          owner_income_dependent: boolean | null
          owner_lives_in_same_city: boolean | null
          owner_only_rental_property: boolean | null
          owner_pet_preference: string | null
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
          service_agreement_id: string | null
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
          agreement_pending_at?: string | null
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
          building_name: string
          building_notes?: string | null
          building_rules?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_listed_period_started_at?: string | null
          description?: string | null
          district?: string | null
          draft_at?: string | null
          expected_price_per_sqft?: number | null
          facing?: string | null
          flat_number?: string | null
          flat_number_revealed?: boolean
          floor_number?: number | null
          floor_plan_url?: string | null
          formatted_address?: string | null
          furnishing?: Database["public"]["Enums"]["furnishing_type"] | null
          furnishing_detail?: Json | null
          gas_type?: string | null
          google_maps_url?: string | null
          id?: string
          inspected_at?: string | null
          inspection_accepted_at?: string | null
          inspection_date?: string | null
          inspection_end_time?: string | null
          inspection_notes?: string | null
          inspection_proposed_at?: string | null
          inspection_scheduled_at?: string | null
          inspection_start_time?: string | null
          is_active?: boolean
          khata_type?: string | null
          landmark?: string | null
          last_leased_at?: string | null
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
          location_verified_at?: string | null
          location_verified_by_owner?: boolean
          lock_in_months?: number | null
          longitude?: number | null
          main_door_lock_type?: string | null
          maintenance_included_in_rent?: boolean
          map_pin_url?: string | null
          move_in_charges_amount?: number | null
          neighborhood?: string | null
          notice_period_days?: number | null
          notice_period_months?: number | null
          occupied_at?: string | null
          off_market_at?: string | null
          owner_committed_12_months?: boolean | null
          owner_diet_preference?: string | null
          owner_has_local_rep?: boolean | null
          owner_id: string
          owner_income_dependent?: boolean | null
          owner_lives_in_same_city?: boolean | null
          owner_only_rental_property?: boolean | null
          owner_pet_preference?: string | null
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
          service_agreement_id?: string | null
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
          agreement_pending_at?: string | null
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
          building_name?: string
          building_notes?: string | null
          building_rules?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_listed_period_started_at?: string | null
          description?: string | null
          district?: string | null
          draft_at?: string | null
          expected_price_per_sqft?: number | null
          facing?: string | null
          flat_number?: string | null
          flat_number_revealed?: boolean
          floor_number?: number | null
          floor_plan_url?: string | null
          formatted_address?: string | null
          furnishing?: Database["public"]["Enums"]["furnishing_type"] | null
          furnishing_detail?: Json | null
          gas_type?: string | null
          google_maps_url?: string | null
          id?: string
          inspected_at?: string | null
          inspection_accepted_at?: string | null
          inspection_date?: string | null
          inspection_end_time?: string | null
          inspection_notes?: string | null
          inspection_proposed_at?: string | null
          inspection_scheduled_at?: string | null
          inspection_start_time?: string | null
          is_active?: boolean
          khata_type?: string | null
          landmark?: string | null
          last_leased_at?: string | null
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
          location_verified_at?: string | null
          location_verified_by_owner?: boolean
          lock_in_months?: number | null
          longitude?: number | null
          main_door_lock_type?: string | null
          maintenance_included_in_rent?: boolean
          map_pin_url?: string | null
          move_in_charges_amount?: number | null
          neighborhood?: string | null
          notice_period_days?: number | null
          notice_period_months?: number | null
          occupied_at?: string | null
          off_market_at?: string | null
          owner_committed_12_months?: boolean | null
          owner_diet_preference?: string | null
          owner_has_local_rep?: boolean | null
          owner_id?: string
          owner_income_dependent?: boolean | null
          owner_lives_in_same_city?: boolean | null
          owner_only_rental_property?: boolean | null
          owner_pet_preference?: string | null
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
          service_agreement_id?: string | null
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
            foreignKeyName: "fk_properties_service_agreement"
            columns: ["service_agreement_id"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
          {
            foreignKeyName: "property_activity_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
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
            foreignKeyName: "property_comments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
      property_condition_reports: {
        Row: {
          conducted_by: string
          created_at: string
          damage_items: Json | null
          id: string
          inspection_date: string
          lease_id: string
          notes: string | null
          photo_urls: string[] | null
          property_id: string
          report_type: Database["public"]["Enums"]["condition_report_type"]
          tenant_sign_off_at: string | null
          tenant_signed_off: boolean
          total_damage_cost: number
          updated_at: string
        }
        Insert: {
          conducted_by: string
          created_at?: string
          damage_items?: Json | null
          id?: string
          inspection_date: string
          lease_id: string
          notes?: string | null
          photo_urls?: string[] | null
          property_id: string
          report_type: Database["public"]["Enums"]["condition_report_type"]
          tenant_sign_off_at?: string | null
          tenant_signed_off?: boolean
          total_damage_cost?: number
          updated_at?: string
        }
        Update: {
          conducted_by?: string
          created_at?: string
          damage_items?: Json | null
          id?: string
          inspection_date?: string
          lease_id?: string
          notes?: string | null
          photo_urls?: string[] | null
          property_id?: string
          report_type?: Database["public"]["Enums"]["condition_report_type"]
          tenant_sign_off_at?: string | null
          tenant_signed_off?: boolean
          total_damage_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_condition_reports_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_condition_reports_conducted_by_fkey"
            columns: ["conducted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_condition_reports_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_condition_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_condition_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
            foreignKeyName: "property_edit_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_edit_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
          {
            foreignKeyName: "property_inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "property_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
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
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
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
      visit_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          initiated_by: string
          note_type: string | null
          notes: string | null
          property_id: string
          rescheduled_to_visit_id: string | null
          scheduled_at: string | null
          tenant_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          initiated_by?: string
          note_type?: string | null
          notes?: string | null
          property_id: string
          rescheduled_to_visit_id?: string | null
          scheduled_at?: string | null
          tenant_id: string
          visit_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          initiated_by?: string
          note_type?: string | null
          notes?: string | null
          property_id?: string
          rescheduled_to_visit_id?: string | null
          scheduled_at?: string | null
          tenant_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_events_rescheduled_to_visit_id_fkey"
            columns: ["rescheduled_to_visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "visit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_events_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          full_address_sent: boolean
          id: string
          no_show_at: string | null
          notes: string | null
          platform_rep_name: string | null
          platform_rep_phone: string | null
          previous_scheduled_at: string | null
          property_id: string
          reminder_sent_24h: boolean
          reminder_sent_2h: boolean
          rescheduled_by: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["visit_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          full_address_sent?: boolean
          id?: string
          no_show_at?: string | null
          notes?: string | null
          platform_rep_name?: string | null
          platform_rep_phone?: string | null
          previous_scheduled_at?: string | null
          property_id: string
          reminder_sent_24h?: boolean
          reminder_sent_2h?: boolean
          rescheduled_by?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["visit_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          full_address_sent?: boolean
          id?: string
          no_show_at?: string | null
          notes?: string | null
          platform_rep_name?: string | null
          platform_rep_phone?: string | null
          previous_scheduled_at?: string | null
          property_id?: string
          reminder_sent_24h?: boolean
          reminder_sent_2h?: boolean
          rescheduled_by?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_with_flat_number"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "visits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      properties_with_flat_number: {
        Row: {
          building_name: string | null
          flat_number: string | null
          flat_number_revealed: boolean | null
          floor_number: number | null
          id: string | null
        }
        Insert: {
          building_name?: string | null
          flat_number?: string | null
          flat_number_revealed?: boolean | null
          floor_number?: number | null
          id?: string | null
        }
        Update: {
          building_name?: string | null
          flat_number?: string | null
          flat_number_revealed?: boolean | null
          floor_number?: number | null
          id?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          bio: string | null
          display_name: string | null
          full_name: string | null
          is_public: boolean | null
          profile_photo_url: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_draft_property: {
        Args: { p_property_id: string }
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
      complete_visit: {
        Args: {
          p_admin_note?: string
          p_property_feedback?: string
          p_visit_id: string
        }
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
      confirm_sale_listing: {
        Args: { p_property_id: string }
        Returns: {
          confirmed_at: string
          next_confirmation_at: string
          property_id: string
        }[]
      }
      delete_own_comment: { Args: { p_comment_id: string }; Returns: Json }
      earth: { Args: never; Returns: number }
      ensure_user_exists: { Args: never; Returns: undefined }
      generate_pseudonym: { Args: never; Returns: string }
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
      get_map_markers: {
        Args: {
          p_amenities?: string[]
          p_area_boxes?: Json
          p_availability_confirmed_within_days?: number
          p_available_by?: string
          p_bhk?: string[]
          p_city: string
          p_furnishing?: string[]
          p_has_experience_feedback?: boolean
          p_has_video_walkthrough?: boolean
          p_khata_type?: string[]
          p_limit?: number
          p_listed_within_days?: number
          p_listing_type: Database["public"]["Enums"]["property_listing_type"]
          p_location_ids?: string[]
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
          p_ne_lat: number
          p_ne_lng: number
          p_negotiable?: boolean
          p_parking_2w?: string[]
          p_parking_4w?: string[]
          p_pet_policy?: string[]
          p_possession_before?: string
          p_possession_status?: string[]
          p_property_tax_paid?: boolean
          p_property_type?: string
          p_rera_disclosed?: boolean
          p_sw_lat: number
          p_sw_lng: number
          p_zero_rent_brokerage?: boolean
        }
        Returns: {
          building_name: string
          latitude: number
          listing_type: string
          location_mode: string
          longitude: number
          match_count: number
          price_amount: number
          price_kind: string
          property_id: string
        }[]
      }
      get_my_daily_request_remaining: { Args: never; Returns: number }
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
      report_comment: {
        Args: { p_comment_id: string; p_notes?: string; p_reason: string }
        Returns: Json
      }
      reschedule_visit: {
        Args: {
          p_actor: string
          p_new_scheduled_at: string
          p_visit_id: string
        }
        Returns: string
      }
      run_stale_listing_sweep: { Args: never; Returns: number }
      search_compact_properties: {
        Args: {
          p_amenities?: string[]
          p_area_boxes?: Json
          p_availability_confirmed_within_days?: number
          p_available_by?: string
          p_bhk?: string[]
          p_city: string
          p_cursor_availability_confirmed_at?: string
          p_cursor_id?: string
          p_cursor_listed_at?: string
          p_cursor_price_amount?: number
          p_furnishing?: string[]
          p_has_experience_feedback?: boolean
          p_has_video_walkthrough?: boolean
          p_khata_type?: string[]
          p_limit?: number
          p_listed_within_days?: number
          p_listing_type: Database["public"]["Enums"]["property_listing_type"]
          p_location_ids?: string[]
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
          total_floors: number
          youtube_walkthrough_url: string
        }[]
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
      agreement_status:
        | "draft"
        | "pending_owner_sign"
        | "pending_tenant_sign"
        | "pending_agency_sign"
        | "fully_signed"
        | "expired"
        | "terminated"
      agreement_type: "service_agreement" | "tripartite_lease"
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
      application_status:
        | "draft"
        | "submitted"
        | "platform_review"
        | "platform_rejected"
        | "sent_to_owner"
        | "owner_accepted"
        | "owner_rejected"
        | "owner_countered"
        | "tenant_countered"
        | "payment_pending"
        | "payment_received"
        | "kyc_pending"
        | "kyc_passed"
        | "kyc_failed"
        | "agreement_pending"
        | "lease_active"
        | "withdrawn"
        | "expired"
        | "on_hold"
      auth_provider: "phone_otp" | "google" | "apple" | "email_otp"
      bhk_type: "1BHK" | "2BHK" | "3BHK" | "4BHK" | "5BHK_plus" | "studio"
      bill_compliance_status:
        | "undisclosed"
        | "self_declared_paid"
        | "platform_verified"
        | "overdue_flagged"
      board_status:
        | "not_installed"
        | "installed"
        | "needs_replacement"
        | "removed"
      cibil_range_type:
        | "below_550"
        | "550_to_649"
        | "650_to_749"
        | "750_to_900"
        | "no_credit_history"
        | "not_sure"
      condition_report_type: "move_in" | "move_out" | "periodic_inspection"
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
      damage_severity: "low" | "medium" | "high"
      diet_type: "vegetarian" | "non_vegetarian"
      document_category:
        | "tenant_kyc"
        | "owner_kyc"
        | "agreement"
        | "inspection"
        | "condition_report"
        | "payment_receipt"
        | "maintenance"
        | "lead"
      document_type:
        | "aadhaar"
        | "pan"
        | "salary_slip"
        | "employment_letter"
        | "itr"
        | "bank_statement"
        | "passport"
        | "visa"
        | "frro_registration"
        | "sale_deed"
        | "property_papers"
        | "society_noc"
        | "condition_report"
        | "agreement"
        | "receipt"
        | "inspection_report"
        | "other"
        | "electricity_bill"
      eligibility_status: "pending" | "passed" | "disqualified"
      external_query_category:
        | "noise"
        | "water_leak"
        | "society_matter"
        | "maintenance"
        | "emergency"
        | "other"
      external_query_status: "open" | "in_progress" | "resolved" | "closed"
      furnishing_type: "unfurnished" | "semi_furnished" | "fully_furnished"
      gender_type: "male" | "female" | "other" | "prefer_not_to_say"
      inspection_mode: "in_person" | "virtual"
      inspection_status: "scheduled" | "in_progress" | "completed"
      key_event_type:
        | "collected_from_owner"
        | "handed_to_tenant"
        | "returned_by_tenant"
        | "handed_to_vendor"
        | "returned_by_vendor"
        | "replaced"
        | "lost"
      key_holder_type: "platform" | "tenant" | "owner" | "vendor"
      lead_status:
        | "new"
        | "contacted"
        | "interested"
        | "inspection_scheduled"
        | "converted"
        | "dropped"
      lease_status:
        | "active"
        | "lock_in"
        | "notice_period"
        | "expiring"
        | "expired"
        | "terminated_early"
        | "renewed"
      maintenance_category:
        | "plumbing"
        | "electrical"
        | "carpentry"
        | "appliances"
        | "cleaning"
        | "painting"
        | "pest_control"
        | "internet"
        | "security"
        | "other"
      maintenance_status:
        | "submitted"
        | "assigned"
        | "in_progress"
        | "resolved"
        | "closed"
        | "escalated"
      marital_status: "single" | "married" | "live_in"
      occupation_type:
        | "salaried"
        | "self_employed"
        | "freelancer"
        | "student"
        | "retired"
      parking_availability: "none" | "covered" | "uncovered" | "both"
      payment_method: "upi" | "net_banking" | "e_nach"
      payment_status:
        | "pending"
        | "processing"
        | "success"
        | "failed"
        | "refunded"
        | "disputed"
      payment_type:
        | "confirmation_first_month_rent"
        | "token_deposit"
        | "security_deposit"
        | "monthly_rent"
        | "service_fee"
        | "gst"
        | "kyc_service_charge"
        | "refund"
        | "damage_recovery"
        | "early_exit_fee"
      pet_type: "none" | "dog" | "cat" | "bird" | "other"
      property_listing_type: "rent" | "sale"
      property_status:
        | "draft"
        | "inspection_proposed"
        | "inspection_accepted"
        | "inspection_scheduled"
        | "inspected"
        | "agreement_pending"
        | "listed"
        | "off_market"
        | "occupied"
        | "expiring"
        | "turnover"
        | "inactive"
        | "pending_review"
        | "changes_requested"
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
      stay_duration_type:
        | "less_than_10_months"
        | "10_to_12_months"
        | "1_to_2_years"
        | "2_to_3_years"
        | "3_plus_years"
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
      visit_status:
        | "scheduled"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "no_show"
        | "rescheduled"
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
      agreement_status: [
        "draft",
        "pending_owner_sign",
        "pending_tenant_sign",
        "pending_agency_sign",
        "fully_signed",
        "expired",
        "terminated",
      ],
      agreement_type: ["service_agreement", "tripartite_lease"],
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
      application_status: [
        "draft",
        "submitted",
        "platform_review",
        "platform_rejected",
        "sent_to_owner",
        "owner_accepted",
        "owner_rejected",
        "owner_countered",
        "tenant_countered",
        "payment_pending",
        "payment_received",
        "kyc_pending",
        "kyc_passed",
        "kyc_failed",
        "agreement_pending",
        "lease_active",
        "withdrawn",
        "expired",
        "on_hold",
      ],
      auth_provider: ["phone_otp", "google", "apple", "email_otp"],
      bhk_type: ["1BHK", "2BHK", "3BHK", "4BHK", "5BHK_plus", "studio"],
      bill_compliance_status: [
        "undisclosed",
        "self_declared_paid",
        "platform_verified",
        "overdue_flagged",
      ],
      board_status: [
        "not_installed",
        "installed",
        "needs_replacement",
        "removed",
      ],
      cibil_range_type: [
        "below_550",
        "550_to_649",
        "650_to_749",
        "750_to_900",
        "no_credit_history",
        "not_sure",
      ],
      condition_report_type: ["move_in", "move_out", "periodic_inspection"],
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
      damage_severity: ["low", "medium", "high"],
      diet_type: ["vegetarian", "non_vegetarian"],
      document_category: [
        "tenant_kyc",
        "owner_kyc",
        "agreement",
        "inspection",
        "condition_report",
        "payment_receipt",
        "maintenance",
        "lead",
      ],
      document_type: [
        "aadhaar",
        "pan",
        "salary_slip",
        "employment_letter",
        "itr",
        "bank_statement",
        "passport",
        "visa",
        "frro_registration",
        "sale_deed",
        "property_papers",
        "society_noc",
        "condition_report",
        "agreement",
        "receipt",
        "inspection_report",
        "other",
        "electricity_bill",
      ],
      eligibility_status: ["pending", "passed", "disqualified"],
      external_query_category: [
        "noise",
        "water_leak",
        "society_matter",
        "maintenance",
        "emergency",
        "other",
      ],
      external_query_status: ["open", "in_progress", "resolved", "closed"],
      furnishing_type: ["unfurnished", "semi_furnished", "fully_furnished"],
      gender_type: ["male", "female", "other", "prefer_not_to_say"],
      inspection_mode: ["in_person", "virtual"],
      inspection_status: ["scheduled", "in_progress", "completed"],
      key_event_type: [
        "collected_from_owner",
        "handed_to_tenant",
        "returned_by_tenant",
        "handed_to_vendor",
        "returned_by_vendor",
        "replaced",
        "lost",
      ],
      key_holder_type: ["platform", "tenant", "owner", "vendor"],
      lead_status: [
        "new",
        "contacted",
        "interested",
        "inspection_scheduled",
        "converted",
        "dropped",
      ],
      lease_status: [
        "active",
        "lock_in",
        "notice_period",
        "expiring",
        "expired",
        "terminated_early",
        "renewed",
      ],
      maintenance_category: [
        "plumbing",
        "electrical",
        "carpentry",
        "appliances",
        "cleaning",
        "painting",
        "pest_control",
        "internet",
        "security",
        "other",
      ],
      maintenance_status: [
        "submitted",
        "assigned",
        "in_progress",
        "resolved",
        "closed",
        "escalated",
      ],
      marital_status: ["single", "married", "live_in"],
      occupation_type: [
        "salaried",
        "self_employed",
        "freelancer",
        "student",
        "retired",
      ],
      parking_availability: ["none", "covered", "uncovered", "both"],
      payment_method: ["upi", "net_banking", "e_nach"],
      payment_status: [
        "pending",
        "processing",
        "success",
        "failed",
        "refunded",
        "disputed",
      ],
      payment_type: [
        "confirmation_first_month_rent",
        "token_deposit",
        "security_deposit",
        "monthly_rent",
        "service_fee",
        "gst",
        "kyc_service_charge",
        "refund",
        "damage_recovery",
        "early_exit_fee",
      ],
      pet_type: ["none", "dog", "cat", "bird", "other"],
      property_listing_type: ["rent", "sale"],
      property_status: [
        "draft",
        "inspection_proposed",
        "inspection_accepted",
        "inspection_scheduled",
        "inspected",
        "agreement_pending",
        "listed",
        "off_market",
        "occupied",
        "expiring",
        "turnover",
        "inactive",
        "pending_review",
        "changes_requested",
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
      stay_duration_type: [
        "less_than_10_months",
        "10_to_12_months",
        "1_to_2_years",
        "2_to_3_years",
        "3_plus_years",
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
      visit_status: [
        "scheduled",
        "confirmed",
        "completed",
        "cancelled",
        "no_show",
        "rescheduled",
      ],
    },
  },
} as const
