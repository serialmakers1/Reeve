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
          cibil_range: Database["public"]["Enums"]["cibil_range_type"] | null
          created_at: string
          crime_record_self_attest: boolean
          eligibility_id: string | null
          employer_name: string | null
          final_agreed_rent: number | null
          id: string
          id_verification_done: boolean
          income_check_passed: boolean | null
          kyc_completed_at: string | null
          monthly_income: number | null
          owner_actioned_at: string | null
          owner_counter_rent: number | null
          platform_approved: boolean | null
          platform_review_notes: string | null
          property_id: string
          property_notes_text: string | null
          proposed_rent: number
          rejection_reason: string | null
          service_fee_terms_confirmed: boolean
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          tds_applicable: boolean
          tenant_id: string
          updated_at: string
          visit_id: string | null
        }
        Insert: {
          cibil_range?: Database["public"]["Enums"]["cibil_range_type"] | null
          created_at?: string
          crime_record_self_attest?: boolean
          eligibility_id?: string | null
          employer_name?: string | null
          final_agreed_rent?: number | null
          id?: string
          id_verification_done?: boolean
          income_check_passed?: boolean | null
          kyc_completed_at?: string | null
          monthly_income?: number | null
          owner_actioned_at?: string | null
          owner_counter_rent?: number | null
          platform_approved?: boolean | null
          platform_review_notes?: string | null
          property_id: string
          property_notes_text?: string | null
          proposed_rent: number
          rejection_reason?: string | null
          service_fee_terms_confirmed?: boolean
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          tds_applicable?: boolean
          tenant_id: string
          updated_at?: string
          visit_id?: string | null
        }
        Update: {
          cibil_range?: Database["public"]["Enums"]["cibil_range_type"] | null
          created_at?: string
          crime_record_self_attest?: boolean
          eligibility_id?: string | null
          employer_name?: string | null
          final_agreed_rent?: number | null
          id?: string
          id_verification_done?: boolean
          income_check_passed?: boolean | null
          kyc_completed_at?: string | null
          monthly_income?: number | null
          owner_actioned_at?: string | null
          owner_counter_rent?: number | null
          platform_approved?: boolean | null
          platform_review_notes?: string | null
          property_id?: string
          property_notes_text?: string | null
          proposed_rent?: number
          rejection_reason?: string | null
          service_fee_terms_confirmed?: boolean
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          tds_applicable?: boolean
          tenant_id?: string
          updated_at?: string
          visit_id?: string | null
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
            foreignKeyName: "applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
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
          converted_property_id: string | null
          created_at: string
          expected_rent: number | null
          id: string
          locality: string | null
          notes: string | null
          owner_email: string | null
          owner_name: string
          owner_phone: string
          property_address: string
          referred_by_tenant_id: string
          status: Database["public"]["Enums"]["lead_status"]
          tenant_notified_on_listing: boolean
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          bhk?: Database["public"]["Enums"]["bhk_type"] | null
          building_name?: string | null
          city?: string | null
          converted_property_id?: string | null
          created_at?: string
          expected_rent?: number | null
          id?: string
          locality?: string | null
          notes?: string | null
          owner_email?: string | null
          owner_name: string
          owner_phone: string
          property_address: string
          referred_by_tenant_id: string
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_notified_on_listing?: boolean
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          bhk?: Database["public"]["Enums"]["bhk_type"] | null
          building_name?: string | null
          city?: string | null
          converted_property_id?: string | null
          created_at?: string
          expected_rent?: number | null
          id?: string
          locality?: string | null
          notes?: string | null
          owner_email?: string | null
          owner_name?: string
          owner_phone?: string
          property_address?: string
          referred_by_tenant_id?: string
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_notified_on_listing?: boolean
          updated_at?: string
        }
        Relationships: [
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
            foreignKeyName: "maintenance_requests_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
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
            referencedRelation: "users"
            referencedColumns: ["id"]
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
          bank_account_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          created_at: string
          date_of_birth: string | null
          diet: Database["public"]["Enums"]["diet_type"] | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          has_pets: boolean | null
          id: string
          is_foreign_citizen: boolean
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
        }
        Insert: {
          aadhaar_last4?: string | null
          aadhaar_number?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          created_at?: string
          date_of_birth?: string | null
          diet?: Database["public"]["Enums"]["diet_type"] | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          has_pets?: boolean | null
          id?: string
          is_foreign_citizen?: boolean
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
        }
        Update: {
          aadhaar_last4?: string | null
          aadhaar_number?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          created_at?: string
          date_of_birth?: string | null
          diet?: Database["public"]["Enums"]["diet_type"] | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          has_pets?: boolean | null
          id?: string
          is_foreign_citizen?: boolean
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
          amenities: Json | null
          auto_accept_enabled: boolean
          bhk: Database["public"]["Enums"]["bhk_type"]
          board_installed_at: string | null
          board_qr_code: string | null
          board_removed_at: string | null
          board_status: Database["public"]["Enums"]["board_status"]
          building_name: string
          building_rules: string | null
          city: string
          created_at: string
          flat_number: string | null
          flat_number_revealed: boolean
          floor_number: number | null
          floor_plan_url: string | null
          furnishing: Database["public"]["Enums"]["furnishing_type"]
          id: string
          is_active: boolean
          last_leased_at: string | null
          latitude: number | null
          listed_at: string | null
          listed_rent: number
          locality: string | null
          longitude: number | null
          main_door_lock_type: string | null
          map_pin_url: string | null
          off_market_at: string | null
          owner_id: string
          parking_2w: Database["public"]["Enums"]["parking_availability"]
          parking_4w: Database["public"]["Enums"]["parking_availability"]
          pet_policy: string | null
          pincode: string | null
          security_deposit_months: number
          service_agreement_id: string | null
          society_maintenance_approx: number | null
          square_footage: number | null
          state: string
          status: Database["public"]["Enums"]["property_status"]
          street_address: string
          updated_at: string
          utility_electricity_included: boolean
          utility_gas_included: boolean
          utility_water_included: boolean
          vacancy_review_day14_at: string | null
          vacancy_review_day21_at: string | null
        }
        Insert: {
          amenities?: Json | null
          auto_accept_enabled?: boolean
          bhk: Database["public"]["Enums"]["bhk_type"]
          board_installed_at?: string | null
          board_qr_code?: string | null
          board_removed_at?: string | null
          board_status?: Database["public"]["Enums"]["board_status"]
          building_name: string
          building_rules?: string | null
          city: string
          created_at?: string
          flat_number?: string | null
          flat_number_revealed?: boolean
          floor_number?: number | null
          floor_plan_url?: string | null
          furnishing: Database["public"]["Enums"]["furnishing_type"]
          id?: string
          is_active?: boolean
          last_leased_at?: string | null
          latitude?: number | null
          listed_at?: string | null
          listed_rent: number
          locality?: string | null
          longitude?: number | null
          main_door_lock_type?: string | null
          map_pin_url?: string | null
          off_market_at?: string | null
          owner_id: string
          parking_2w?: Database["public"]["Enums"]["parking_availability"]
          parking_4w?: Database["public"]["Enums"]["parking_availability"]
          pet_policy?: string | null
          pincode?: string | null
          security_deposit_months?: number
          service_agreement_id?: string | null
          society_maintenance_approx?: number | null
          square_footage?: number | null
          state?: string
          status?: Database["public"]["Enums"]["property_status"]
          street_address: string
          updated_at?: string
          utility_electricity_included?: boolean
          utility_gas_included?: boolean
          utility_water_included?: boolean
          vacancy_review_day14_at?: string | null
          vacancy_review_day21_at?: string | null
        }
        Update: {
          amenities?: Json | null
          auto_accept_enabled?: boolean
          bhk?: Database["public"]["Enums"]["bhk_type"]
          board_installed_at?: string | null
          board_qr_code?: string | null
          board_removed_at?: string | null
          board_status?: Database["public"]["Enums"]["board_status"]
          building_name?: string
          building_rules?: string | null
          city?: string
          created_at?: string
          flat_number?: string | null
          flat_number_revealed?: boolean
          floor_number?: number | null
          floor_plan_url?: string | null
          furnishing?: Database["public"]["Enums"]["furnishing_type"]
          id?: string
          is_active?: boolean
          last_leased_at?: string | null
          latitude?: number | null
          listed_at?: string | null
          listed_rent?: number
          locality?: string | null
          longitude?: number | null
          main_door_lock_type?: string | null
          map_pin_url?: string | null
          off_market_at?: string | null
          owner_id?: string
          parking_2w?: Database["public"]["Enums"]["parking_availability"]
          parking_4w?: Database["public"]["Enums"]["parking_availability"]
          pet_policy?: string | null
          pincode?: string | null
          security_deposit_months?: number
          service_agreement_id?: string | null
          society_maintenance_approx?: number | null
          square_footage?: number | null
          state?: string
          status?: Database["public"]["Enums"]["property_status"]
          street_address?: string
          updated_at?: string
          utility_electricity_included?: boolean
          utility_gas_included?: boolean
          utility_water_included?: boolean
          vacancy_review_day14_at?: string | null
          vacancy_review_day21_at?: string | null
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
          phone: string
          phone_verified: boolean
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
          phone: string
          phone_verified?: boolean
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
          phone?: string
          phone_verified?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      visits: {
        Row: {
          application_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          full_address_sent: boolean
          id: string
          no_show_at: string | null
          notes: string | null
          platform_rep_name: string | null
          platform_rep_phone: string | null
          property_id: string
          reminder_sent_24h: boolean
          reminder_sent_2h: boolean
          scheduled_at: string
          status: Database["public"]["Enums"]["visit_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          full_address_sent?: boolean
          id?: string
          no_show_at?: string | null
          notes?: string | null
          platform_rep_name?: string | null
          platform_rep_phone?: string | null
          property_id: string
          reminder_sent_24h?: boolean
          reminder_sent_2h?: boolean
          scheduled_at: string
          status?: Database["public"]["Enums"]["visit_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          full_address_sent?: boolean
          id?: string
          no_show_at?: string | null
          notes?: string | null
          platform_rep_name?: string | null
          platform_rep_phone?: string | null
          property_id?: string
          reminder_sent_24h?: boolean
          reminder_sent_2h?: boolean
          scheduled_at?: string
          status?: Database["public"]["Enums"]["visit_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_visits_application_id"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
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
      [_ in never]: never
    }
    Functions: {
      earth: { Args: never; Returns: number }
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
      application_status:
        | "draft"
        | "submitted"
        | "platform_review"
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
      auth_provider: "phone_otp" | "google" | "apple"
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
        | "security_deposit"
        | "monthly_rent"
        | "service_fee"
        | "gst"
        | "kyc_service_charge"
        | "refund"
        | "damage_recovery"
        | "early_exit_fee"
      pet_type: "none" | "dog" | "cat" | "bird" | "other"
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
      application_status: [
        "draft",
        "submitted",
        "platform_review",
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
      ],
      auth_provider: ["phone_otp", "google", "apple"],
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
