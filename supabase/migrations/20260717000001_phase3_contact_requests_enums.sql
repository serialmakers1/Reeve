-- Phase 3 Prompt 1 — contact request enums.
-- Applied via Supabase MCP on 2026-07-17; this file is documentation only, not re-run.
-- Enum ADD VALUE cannot run alongside other DDL inside the same transaction, hence separate DO blocks.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_request_status') THEN
    CREATE TYPE public.contact_request_status AS ENUM (
      'pending',
      'approved',
      'declined',
      'withdrawn',
      'auto_cancelled'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_request_decline_reason') THEN
    CREATE TYPE public.contact_request_decline_reason AS ENUM (
      'preferences_dont_fit',
      'property_currently_unavailable',
      'prefer_to_wait',
      'not_the_right_fit',
      'property_no_longer_available'
    );
  END IF;
END $$;
