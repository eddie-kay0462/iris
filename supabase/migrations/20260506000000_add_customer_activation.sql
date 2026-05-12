ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_activated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz NULL;

-- Auto-activate profile when customer accepts invite and confirms email
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET is_activated = true, updated_at = now()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();
