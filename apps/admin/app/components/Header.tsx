"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { Menu, Camera } from "lucide-react";
import { apiClient, clearToken } from "@/lib/api/client";
import { Avatar } from "./Avatar";
import { uploadAvatar } from "@/lib/uploadAvatar";

type HeaderProps = {
  onMenuToggle?: () => void;
};

interface UserProfile {
  id?: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    apiClient<UserProfile>("/profile")
      .then((p) => {
        setProfile(p);
        if (p.email) {
          fetch(`/api/admin/avatar?email=${encodeURIComponent(p.email)}`)
            .then((r) => r.json())
            .then((d) => setAvatarUrl(d.avatar_url ?? null))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile?.email) return;
    setAvatarUploading(true);
    try {
      const userId = profile.id ?? profile.email;
      const url = await uploadAvatar(file, `admins/${userId}`, 'profiles', userId);
      setAvatarUrl(url);
    } catch {
      // silently ignore upload errors in the header
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // Ignore errors — clear token regardless
    } finally {
      clearToken();
      router.push("/login");
    }
  }

  const displayName =
    profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.first_name ?? profile?.email ?? "Admin";

  const avatarLetter =
    profile?.first_name?.[0]?.toUpperCase() ??
    profile?.email?.[0]?.toUpperCase() ??
    "A";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Iris admin
            </p>
            <h2 className="text-lg font-semibold text-slate-900">Operations</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-slate-500">{profile?.email ?? ""}</p>
          </div>
          <label className="relative cursor-pointer group" title="Change profile photo">
            <Avatar url={avatarUrl} name={displayName} size={36} />
            {!avatarUploading && (
              <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-3.5 w-3.5 text-white" />
              </span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
            />
          </label>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50"
          >
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}
