-- RLS for user_favourites

GRANT ALL ON public.user_favourites TO service_role;
GRANT SELECT, INSERT, DELETE ON public.user_favourites TO authenticated;

ALTER TABLE public.user_favourites ENABLE ROW LEVEL SECURITY;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to user_favourites"
  ON public.user_favourites
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can read only their own favourites
CREATE POLICY "Users can read own favourites"
  ON public.user_favourites
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert only for themselves
CREATE POLICY "Users can insert own favourites"
  ON public.user_favourites
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete only their own favourites
CREATE POLICY "Users can delete own favourites"
  ON public.user_favourites
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
