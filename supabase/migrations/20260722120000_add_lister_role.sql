-- F3-C7: lister_role column applied via Supabase MCP. This file records the
-- change for repo history / fresh-env rebuilds. All existing rows were set
-- to 'owner' as part of the MCP apply (matches DEFAULT).

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS lister_role text NOT NULL DEFAULT 'owner';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'properties_lister_role_check'
       AND conrelid = 'public.properties'::regclass
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_lister_role_check
      CHECK (lister_role IN ('owner', 'broker', 'property_manager', 'builder'));
  END IF;
END $$;

COMMENT ON COLUMN public.properties.lister_role IS
  'Who is listing this property. Owner-declared at listing time; locked after publish. Admin can edit anytime.';
