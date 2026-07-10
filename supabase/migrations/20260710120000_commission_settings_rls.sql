-- RLS and grants for commission_settings
--
-- commission_settings is a single-row table of GLOBAL commission defaults
-- (default_quota, default_rate, period) with no per-user data. It was created
-- with grants but RLS was never enabled, which trips the "RLS Disabled in
-- Public" security lint.
--
-- Access pattern:
--   * Admin app writes/reads via the service-role client (bypasses RLS anyway),
--     so service_role gets unrestricted access.
--   * The allies app reads the global defaults with the authenticated browser
--     client, so authenticated needs SELECT. There is no sensitive per-user
--     data here, so authenticated may read the row unconditionally.
--   * All mutations go through the admin service-role client, so no
--     INSERT/UPDATE/DELETE is granted to authenticated.
--   * anon has no access (allies are always signed in).

GRANT ALL    ON public.commission_settings TO service_role;
GRANT SELECT ON public.commission_settings TO authenticated;

ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;

-- Service role (admin server actions) — unrestricted
CREATE POLICY "Service role has full access to commission_settings"
  ON public.commission_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated reads — allies reading the global commission defaults
CREATE POLICY "Authenticated users can read commission_settings"
  ON public.commission_settings
  FOR SELECT
  TO authenticated
  USING (true);
