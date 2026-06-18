-- Add logout tracking columns to ally_logins
-- logged_out_at: when the session ended (null = still active or closed unexpectedly)
-- logout_reason: how the session ended
ALTER TABLE public.ally_logins
  ADD COLUMN IF NOT EXISTS logged_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS logout_reason  text
    CHECK (logout_reason IN ('manual', 'inactivity', 'force_logout', 'session_expired'));

CREATE INDEX IF NOT EXISTS idx_ally_logins_open_sessions
  ON public.ally_logins (ally_id)
  WHERE logged_out_at IS NULL;
