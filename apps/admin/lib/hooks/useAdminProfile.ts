"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, clearToken } from "@/lib/api/client";
import { uploadAvatar } from "@/lib/uploadAvatar";

export interface AdminProfile {
  id?: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number?: string | null;
}

export type ProfileUpdate = {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
};

const PROFILE_KEY = ["admin-profile"] as const;

/**
 * The signed-in admin's profile + avatar, with editing, upload and sign-out.
 * Backed by react-query, so the sidebar, headers, profile modal and account
 * page all read one copy, and a save on the account page updates them all.
 */
export function useAdminProfile() {
  const router = useRouter();
  const qc = useQueryClient();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: profile = null } = useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => apiClient<AdminProfile>("/profile"),
    staleTime: 5 * 60_000,
  });

  const email = profile?.email ?? null;
  const { data: avatarUrl = null } = useQuery({
    queryKey: ["admin-avatar", email],
    queryFn: async () => {
      const r = await fetch(`/api/admin/avatar?email=${encodeURIComponent(email!)}`);
      const d = await r.json();
      return (d.avatar_url as string | null) ?? null;
    },
    enabled: !!email,
    staleTime: 5 * 60_000,
  });

  async function changeAvatar(file: File) {
    if (!profile?.email) return;
    setAvatarUploading(true);
    try {
      const userId = profile.id ?? profile.email;
      const url = await uploadAvatar(file, `admins/${userId}`, "profiles", userId);
      qc.setQueryData(["admin-avatar", profile.email], url);
    } catch {
      toast.error("Failed to upload photo. Please try again.", { duration: 6000 });
    } finally {
      setAvatarUploading(false);
    }
  }

  /** Saves name / phone. Throws on failure so the caller can show the error. */
  async function updateProfile(changes: ProfileUpdate) {
    const updated = await apiClient<AdminProfile>("/profile", { method: "PUT", body: changes });
    qc.setQueryData(PROFILE_KEY, (prev: AdminProfile | undefined) => ({ ...prev, ...updated }) as AdminProfile);
    return updated;
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors — clear token regardless
    } finally {
      clearToken();
      qc.removeQueries({ queryKey: PROFILE_KEY });
      router.push("/login");
    }
  }

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.first_name ?? profile?.email ?? "Admin";

  return {
    profile,
    displayName,
    avatarUrl,
    avatarUploading,
    changeAvatar,
    updateProfile,
    loggingOut,
    logout,
  };
}
