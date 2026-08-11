-- Prompt 1 (geographic foundation) — property ↔ geo_place associations.
--
-- One property may associate with a primary city, up to 2 secondary cities, and
-- area/road entities (including exactly one owner-added extra). Rows are written
-- ONLY via the trusted set_property_geo_associations RPC (service role). Additive.

CREATE TABLE IF NOT EXISTS public.property_geo_associations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  geo_place_id uuid NOT NULL REFERENCES public.geo_places(id) ON DELETE RESTRICT,
  relationship text NOT NULL CHECK (relationship IN ('primary_city', 'secondary_city', 'area_road')),
  source       text NOT NULL CHECK (source IN ('google', 'owner', 'admin')),
  confidence   text CHECK (confidence IN ('high', 'medium', 'low')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- No duplicate association of the same place to the same property.
  CONSTRAINT property_geo_assoc_uniq UNIQUE (property_id, geo_place_id),
  -- source='owner' means the single owner-added extra Area/Road ONLY.
  CONSTRAINT property_geo_assoc_owner_source CHECK (source <> 'owner' OR relationship = 'area_road')
);

COMMENT ON TABLE public.property_geo_associations IS
  'Property↔geo_place associations (primary/secondary city, area/road). Written only via trusted set_property_geo_associations (service role).';

-- One primary city per property.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_property_primary_city
  ON public.property_geo_associations (property_id)
  WHERE relationship = 'primary_city';

-- At most one owner-added area/road per property.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_property_owner_area
  ON public.property_geo_associations (property_id)
  WHERE relationship = 'area_road' AND source = 'owner';

CREATE INDEX IF NOT EXISTS idx_property_geo_assoc_property_id
  ON public.property_geo_associations (property_id);
CREATE INDEX IF NOT EXISTS idx_property_geo_assoc_geo_place_id
  ON public.property_geo_associations (geo_place_id);

-- kind↔relationship compatibility + secondary-city cap (≤2). A CHECK cannot cross
-- tables, so enforce via a BEFORE trigger. Secondary count is serialized by the RPC's
-- property-row FOR UPDATE lock; the count here is a correctness backstop.
CREATE OR REPLACE FUNCTION public.enforce_geo_association_rules()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_kind text;
  v_secondary_count int;
BEGIN
  SELECT kind INTO v_kind FROM public.geo_places WHERE id = NEW.geo_place_id;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'geo_place % does not exist', NEW.geo_place_id;
  END IF;

  IF NEW.relationship IN ('primary_city', 'secondary_city') AND v_kind <> 'city' THEN
    RAISE EXCEPTION 'relationship % requires a city geo_place, got kind %', NEW.relationship, v_kind;
  END IF;
  IF NEW.relationship = 'area_road' AND v_kind NOT IN ('area', 'road') THEN
    RAISE EXCEPTION 'relationship area_road requires an area/road geo_place, got kind %', v_kind;
  END IF;

  IF NEW.relationship = 'secondary_city' THEN
    SELECT count(*) INTO v_secondary_count
    FROM public.property_geo_associations
    WHERE property_id = NEW.property_id
      AND relationship = 'secondary_city'
      AND id <> NEW.id;
    IF v_secondary_count >= 2 THEN
      RAISE EXCEPTION 'At most 2 secondary cities per property';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_geo_association_rules ON public.property_geo_associations;
CREATE TRIGGER trg_enforce_geo_association_rules
  BEFORE INSERT OR UPDATE ON public.property_geo_associations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_geo_association_rules();

-- RLS: owner (own property) + admin may READ; all DML is service-role only.
ALTER TABLE public.property_geo_associations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS property_geo_assoc_select_owner ON public.property_geo_associations;
CREATE POLICY property_geo_assoc_select_owner ON public.property_geo_associations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_geo_associations.property_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS property_geo_assoc_select_admin ON public.property_geo_associations;
CREATE POLICY property_geo_assoc_select_admin ON public.property_geo_associations
  FOR SELECT USING (public.is_admin());

REVOKE ALL ON TABLE public.property_geo_associations FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.property_geo_associations FROM anon, authenticated;
GRANT SELECT ON TABLE public.property_geo_associations TO authenticated;
