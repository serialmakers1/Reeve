-- Stale-listing system (6/6): daily sweep that auto-unlists overdue LISTED
-- properties (rent > 30d, sale > 60d without confirmation) and the pg_cron job.
-- Single atomic UPDATE (idempotent, race-safe via row locks + WHERE re-check),
-- acts on status='listed' ONLY. Writes one 'system' 'auto_unlisted' activity row
-- per property; the 'auto_unlist' marker suppresses the writer's generic row.

CREATE OR REPLACE FUNCTION public.run_stale_listing_sweep()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r       record;
  v_count integer := 0;
BEGIN
  PERFORM set_config('reeve.system_action', 'auto_unlist', true);

  FOR r IN
    WITH upd AS (
      UPDATE public.properties p
         SET status = 'unlisted'
       WHERE p.status = 'listed'
         AND (
           (p.listing_type = 'rent'
             AND COALESCE(p.availability_confirmed_at, p.current_listed_period_started_at, p.listed_at)
                 < now() - interval '30 days')
           OR
           (p.listing_type = 'sale'
             AND COALESCE(p.sale_listing_confirmed_at, p.current_listed_period_started_at, p.listed_at)
                 < now() - interval '60 days')
         )
      RETURNING p.id
    )
    SELECT id FROM upd
  LOOP
    INSERT INTO public.property_activity_log
      (property_id, actor_id, actor_role, action, payload, is_public)
    VALUES
      (r.id, NULL, 'system', 'auto_unlisted',
       jsonb_build_object(
         'summary', 'Your listing was automatically unlisted because its availability wasn''t confirmed in time. Re-list anytime to make it visible again.',
         'from_status', 'listed',
         'to_status',   'unlisted',
         'reason',      'stale_no_confirmation'
       ),
       false);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- Owners/anon must never be able to unlist every overdue property.
REVOKE ALL ON FUNCTION public.run_stale_listing_sweep() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.run_stale_listing_sweep() FROM anon;
REVOKE EXECUTE ON FUNCTION public.run_stale_listing_sweep() FROM authenticated;

-- Daily at 19:00 UTC (00:30 IST), offset from the existing applications job.
SELECT cron.schedule('stale-listing-sweep', '0 19 * * *', $$ SELECT public.run_stale_listing_sweep(); $$);
