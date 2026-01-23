import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

import type { Database } from "../../types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const createClient = () =>
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
