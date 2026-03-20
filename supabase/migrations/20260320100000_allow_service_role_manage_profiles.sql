-- Allow service role to insert and update profiles
-- Needed for admin operations like inviting new users via the admin panel

CREATE POLICY "Service role can manage profiles"
ON public.profiles
TO service_role
USING (true)
WITH CHECK (true);
