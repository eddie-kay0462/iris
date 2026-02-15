-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  subscribed_at timestamptz NOT NULL DEFAULT now()
);

-- Allow service_role full access
GRANT ALL ON public.newsletter_subscribers TO service_role;

-- RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to newsletter_subscribers"
  ON public.newsletter_subscribers
  FOR ALL
  USING (true)
  WITH CHECK (true);
