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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-[11px] text-[#999] dark:text-neutral-500 tracking-[0.1em] uppercase font-mono">
          Loading…
        </div>
      </div>
    );
  }

  return <AccountShell profile={profile as any} />;
}
