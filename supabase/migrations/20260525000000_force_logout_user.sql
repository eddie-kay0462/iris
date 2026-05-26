-- SECURITY DEFINER function lets the service_role delete auth sessions
-- without exposing the auth schema directly via PostgREST.
-- GoTrue validates the session ID on every getUser() call, so deleting
-- the session immediately invalidates the user's access token.
CREATE OR REPLACE FUNCTION public.force_logout_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Deleting from auth.sessions cascades to auth.refresh_tokens via session_id FK
  DELETE FROM auth.sessions WHERE user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.force_logout_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.force_logout_user(uuid) TO service_role;
