-- Track every time an ally signs in to the Allies portal
CREATE TABLE IF NOT EXISTS public.ally_logins (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  ally_id       uuid        NOT NULL REFERENCES public.allies(id) ON DELETE CASCADE,
  logged_in_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_ally_logins_ally_id     ON public.ally_logins (ally_id);
CREATE INDEX idx_ally_logins_logged_in_at ON public.ally_logins (logged_in_at DESC);

-- RLS: only service-role can insert/read (allies app server action + admin app)
ALTER TABLE public.ally_logins ENABLE ROW LEVEL SECURITY;

-- No public policies — all access goes through service role key
GRANT ALL ON public.ally_logins TO service_role;
