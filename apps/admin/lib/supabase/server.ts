import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a Supabase client for use in Server Components, Server Actions, and Route Handlers.
 *
 * This follows the modern @supabase/ssr pattern for Next.js App Router.
 * The cookie handlers are required for session management.
 *
 * Note: In Server Components, cookies can only be read, not written.
 * The setAll function will silently fail in Server Components (which is fine).
 * For cookie writes (like during login), use this in Route Handlers.
 */
export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll is called from Server Components where cookies can't be written.
            // This can be safely ignored if we're in a Server Component.
          }
        },
      },
    }
  );
};
