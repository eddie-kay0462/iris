"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasToken, apiClient } from "@/lib/api/client";
import AccountShell from "./AccountShell";
import "./account.css";

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    apiClient("/profile")
      .then(setProfile)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#999", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: '"SF Mono", "Menlo", "Consolas", monospace' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return <AccountShell profile={profile} />;
}
