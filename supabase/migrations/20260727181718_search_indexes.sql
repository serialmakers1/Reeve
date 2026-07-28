-- Migration 3D: search_indexes
-- Evidence-backed indexes for search_compact_properties query patterns.
-- Applied: 2026-07-27 | Version: 20260727181718
-- All four indexes confirmed eligible via EXPLAIN with enable_seqscan=off (Phase 3 Prompt 6).

CREATE INDEX idx_properties_search_newest
ON public.properties (listing_type, lower(city), listed_at DESC NULLS LAST, id DESC)
WHERE status IN ('listed', 'edit_pending_review') AND is_active = true;

CREATE INDEX idx_properties_search_availability
ON public.properties (lower(city), availability_confirmed_at DESC NULLS LAST, listed_at DESC NULLS LAST, id DESC)
WHERE status IN ('listed', 'edit_pending_review') AND is_active = true AND listing_type = 'rent';

CREATE INDEX idx_properties_search_sale_price
ON public.properties (lower(city), sale_price DESC NULLS LAST, listed_at DESC NULLS LAST, id DESC)
WHERE status IN ('listed', 'edit_pending_review') AND is_active = true AND listing_type = 'sale';

CREATE INDEX idx_properties_amenities_gin
ON public.properties USING GIN (amenities)
WHERE amenities IS NOT NULL;
