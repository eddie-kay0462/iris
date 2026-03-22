"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { apiClient, clearToken } from "@/lib/api/client";

type HeaderProps = {
  onMenuToggle?: () => void;
};

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    apiClient<UserProfile>("/profile")
      .then(setProfile)
      .catch(() => {});
  }, []);

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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
            {avatarLetter}
          </div>
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
