-- report_comment now returns whether THIS report caused the comment to become
-- auto-hidden, so the PropertyDetail comment count can decrement immediately
-- (the server count excludes is_deleted rows; without this the client can't
-- learn a report crossed the 3-reporter threshold — direct reads on
-- comment_reports are revoked).
--
-- The entire existing body is preserved verbatim (auth, verification, FOR UPDATE
-- lock, COMMENT_NOT_FOUND / COMMENT_UNAVAILABLE guards, reason/notes validation,
-- unique-violation -> ALREADY_REPORTED). Because a hidden comment is rejected
-- up front, a post-insert 'auto_hidden_reports' state means THIS report triggered
-- it. Reports #1/#2 return auto_hidden=false. Return type stays jsonb (additive
-- field) — no type regeneration, no grant/RLS/trigger/schema change.

CREATE OR REPLACE FUNCTION public.report_comment(p_comment_id uuid, p_reason text, p_notes text DEFAULT NULL::text)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id     uuid := auth.uid();
  v_phone_ver   boolean;
  v_email_ver   boolean;
  v_is_deleted  boolean;
  v_auto_hidden boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT phone_verified, email_verified
  INTO v_phone_ver, v_email_ver
  FROM public.users WHERE id = v_user_id;

  IF NOT (v_phone_ver AND v_email_ver) THEN
    RAISE EXCEPTION 'VERIFICATION_INCOMPLETE';
  END IF;

  -- Lock the comment row so concurrent reports on the same comment serialize:
  -- the open-count the auto-hide trigger sees is then consistent. Also blocks
  -- new reports piling onto an already hidden/deleted/tombstoned comment.
  SELECT is_deleted INTO v_is_deleted
  FROM public.property_comments
  WHERE id = p_comment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'COMMENT_NOT_FOUND';
  END IF;
  IF v_is_deleted THEN
    RAISE EXCEPTION 'COMMENT_UNAVAILABLE';
  END IF;

  IF p_reason NOT IN ('spam','abusive','false_information','other') THEN
    RAISE EXCEPTION 'INVALID_REASON';
  END IF;

  -- Notes only mandatory when reason = 'other'
  IF p_reason = 'other' AND (p_notes IS NULL OR trim(p_notes) = '') THEN
    RAISE EXCEPTION 'NOTES_REQUIRED';
  END IF;

  BEGIN
    INSERT INTO public.comment_reports (comment_id, reporter_id, reason, notes)
    VALUES (
      p_comment_id,
      v_user_id,
      p_reason,
      NULLIF(trim(COALESCE(p_notes, '')), '')  -- store NULL when empty
    );
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REPORTED';
  END;

  -- The AFTER-INSERT auto-hide trigger has already run in this transaction, so
  -- the row reflects any auto-hide this report just caused. The comment was
  -- visible before the insert (is_deleted rejected above), so a true here means
  -- THIS report crossed the 3-reporter threshold.
  SELECT (is_deleted AND hidden_reason = 'auto_hidden_reports')
  INTO v_auto_hidden
  FROM public.property_comments
  WHERE id = p_comment_id;

  RETURN jsonb_build_object('success', true, 'auto_hidden', COALESCE(v_auto_hidden, false));
END;
$function$;
