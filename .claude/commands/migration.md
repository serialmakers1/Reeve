---
description: Safely create and apply a Supabase schema migration
argument-hint: [describe the change]
---
Task: $ARGUMENTS

Before writing any SQL:
1. Read src/integrations/supabase/types.ts to understand current schema
2. Check if any existing columns or tables already cover this need
3. Confirm the migration is additive only — no column drops, no type changes on existing columns

Write the migration SQL. Rules:
- Always use ALTER TABLE, never CREATE TABLE for existing tables
- Always add DEFAULT values on new columns so existing rows are valid immediately
- Use varchar with CHECK constraints instead of new ENUMs
- Add a COMMENT ON COLUMN describing what the field is for and who can see it

Apply via Supabase MCP apply_migration tool. Verify by querying information_schema.columns after.

Do not touch any frontend files until the migration is confirmed successful.
