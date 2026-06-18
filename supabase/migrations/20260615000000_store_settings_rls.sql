-- RLS and grants for store_settings
--
-- The backend always writes via the service-role admin client, so service_role
-- gets full access unconditionally. Anonymous users get SELECT so the public
-- shipping-options endpoint works even if the frontend ever calls Supabase
-- directly. Authenticated users (admin panel) get SELECT; all mutations go
-- through the NestJS backend (service_role) so no INSERT/UPDATE/DELETE is
-- granted to authenticated.

GRANT ALL    ON public.store_settings TO service_role;
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT ON public.store_settings TO authenticated;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Service role (NestJS admin client) — unrestricted
CREATE POLICY "Service role has full access to store_settings"
  ON public.store_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public reads (anon) — shipping options only, so the checkout page can fetch
-- them without an auth token
CREATE POLICY "Public can read shipping options"
  ON public.store_settings
  FOR SELECT
  TO anon
  USING (key = 'shipping_options');

-- Authenticated reads — admin users reading any setting via the admin panel
CREATE POLICY "Authenticated users can read store settings"
  ON public.store_settings
  FOR SELECT
  TO authenticated
  USING (true);
