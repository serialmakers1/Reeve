-- Prompt 2 (Phase A) — allow locationless drafts.
-- building_name becomes nullable so a real server-side draft can exist before the
-- trusted Google location flow confirms (all canonical geo fields NULL). Building name
-- is enforced only at Submit for apartment/duplex_apartment (transition invariant).
ALTER TABLE public.properties ALTER COLUMN building_name DROP NOT NULL;
