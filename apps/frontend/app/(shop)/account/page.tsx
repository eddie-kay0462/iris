"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasToken } from "@/lib/api/client";
import { useProfile } from "@/lib/api/profile";
import AccountShell from "./AccountShell";
import { PageLoading } from "@/components/shop/Loading";
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
    return <PageLoading label="Loading account" />;
  }

  return <AccountShell profile={profile} />;
}
