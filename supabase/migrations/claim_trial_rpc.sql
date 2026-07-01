-- claim_trial RPC — "Teaser Pass"
-- Atomically binds a TRIAL line to a DASH member for 24h.
-- Max 2 Teaser Passes per core_id (lifetime).
-- SECURITY DEFINER bypasses RLS so anon key can call it safely.
CREATE OR REPLACE FUNCTION public.claim_trial(p_core_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trial  tivi_access_codes%ROWTYPE;
  v_count  INT;
BEGIN
  -- Count lifetime claims for this member
  SELECT COUNT(*) INTO v_count
  FROM tivi_access_codes
  WHERE core_id = p_core_id AND tier = 'TRIAL';

  IF v_count >= 2 THEN
    RETURN json_build_object('error', 'max_trials_reached');
  END IF;

  -- Atomic grab — SKIP LOCKED prevents double-claim under concurrent requests
  UPDATE tivi_access_codes
  SET
    core_id    = p_core_id,
    expires_at = NOW() + INTERVAL '24 hours',
    is_active  = true
  WHERE id = (
    SELECT id FROM tivi_access_codes
    WHERE tier = 'TRIAL' AND core_id IS NULL AND is_active = true
    ORDER BY id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO v_trial;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'no_trials_available');
  END IF;

  RETURN json_build_object(
    'ok',          true,
    'user_xtream', v_trial.user_xtream,
    'pass_xtream', v_trial.pass_xtream,
    'expires_at',  v_trial.expires_at,
    'passes_used', v_count + 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_trial(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.claim_trial(TEXT) TO authenticated;
