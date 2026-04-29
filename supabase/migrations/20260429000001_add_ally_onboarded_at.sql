-- Track whether an ally has completed the onboarding flow.
-- NULL = not yet onboarded (show onboarding on first login).
ALTER TABLE public.allies ADD COLUMN IF NOT EXISTS onboarded_at timestamptz DEFAULT NULL;
