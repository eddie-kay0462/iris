"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasToken } from "@/lib/api/client";
import { useProfile } from "@/lib/api/profile";
import AccountShell from "./AccountShell";
import "./account.css";

export default function AccountPage() {
  const router = useRouter();
  const { data: profile, isLoading, isError } = useProfile(hasToken());

  useEffect(() => {
    if (!hasToken()) router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (isError) router.replace("/login");
  }, [isError, router]);

  if (isLoading || !profile) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 11, color: "#999", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: '"SF Mono", "Menlo", "Consolas", monospace' }}>
          Loading…
        </div>
      </div>
    );
  }

  return <AccountShell profile={profile as any} />;
}
