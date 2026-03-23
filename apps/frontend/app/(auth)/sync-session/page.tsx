"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apiClient, setToken } from "@/lib/api/client";

/**
 * Transitional page that converts an active Supabase session (set by the
 * /api/auth/callback route) into the app's custom JWT.
 *
 * Used after email confirmation and magic-link login flows.
 */
function SyncSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    async function sync() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      try {
        const data = await apiClient<{ access_token: string }>("/auth/sync", {
          method: "POST",
          body: { access_token: session.access_token },
        });
        setToken(data.access_token);
      } catch {
        // Sync failed — fall back to login
        router.replace("/login");
        return;
      }

      router.replace(next);
    }

    sync();
  }, [next, router]);

  return (
    <div className="w-full text-center text-sm text-gray-500">
      Signing you in…
    </div>
  );
}

export default function SyncSessionPage() {
  return (
    <Suspense>
      <SyncSessionContent />
    </Suspense>
  );
}
