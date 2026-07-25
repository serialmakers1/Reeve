-- =================================================================
-- Reeve: Make bhk, furnishing, state nullable
-- Resolves createDraft INSERT failure for address-only drafts.
-- Semantics: NULL means "not yet chosen" (draft only).
-- Submission gate (isSectionComplete) enforces non-null before listing.
-- All existing rows have valid values — no backfill needed.
-- =================================================================

ALTER TABLE public.properties
  ALTER COLUMN bhk DROP NOT NULL;

ALTER TABLE public.properties
  ALTER COLUMN furnishing DROP NOT NULL;

ALTER TABLE public.properties
  ALTER COLUMN state DROP NOT NULL;
