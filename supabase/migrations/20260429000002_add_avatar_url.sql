-- Add optional profile picture URL to allies and user profiles.
-- NULL means no photo set; initials are used as fallback in the UI.
ALTER TABLE public.allies   ADD COLUMN IF NOT EXISTS avatar_url text NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text NULL;
