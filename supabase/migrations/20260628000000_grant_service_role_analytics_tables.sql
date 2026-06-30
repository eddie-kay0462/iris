-- The analytics-revamp tables (checkout_sessions, analytics_events) were created
-- with RLS enabled but no table-level grants to service_role. service_role
-- bypasses RLS, but still needs GRANTs — without them every backend write
-- (checkout snapshots, the tracking beacon) failed with "42501: permission
-- denied", silently, because the snapshot path ignored the Supabase error.
--
-- Grant service_role full access. RLS stays on with no anon/authenticated
-- policies, so these tables remain backend-only as intended.

grant all privileges on table public.checkout_sessions to service_role;
grant all privileges on table public.analytics_events  to service_role;
