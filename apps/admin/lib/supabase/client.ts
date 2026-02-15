import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "../../types/database.types";

/**
 * Create a Supabase client for use in Client Components.
 *
 * This follows the modern @supabase/ssr pattern for Next.js App Router.
 * The browser client handles cookie management automatically.
 */
export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
