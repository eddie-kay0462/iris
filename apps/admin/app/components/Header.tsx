"use client";

import Link from "next/link";
import { useRef } from "react";
import { Menu, Camera, Sparkles } from "lucide-react";
import { Avatar } from "./Avatar";
import { useAdminProfile } from "@/lib/hooks/useAdminProfile";
import { useUiMode } from "@/lib/ui/UiModeContext";

type HeaderProps = {
  onMenuToggle?: () => void;
};

export function Header({ onMenuToggle }: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile, displayName, avatarUrl, avatarUploading, changeAvatar, loggingOut, logout } =
    useAdminProfile();
  const { setUi } = useUiMode();

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await changeAvatar(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

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
          <button
            onClick={() => setUi("new")}
            className="hidden items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 sm:flex"
            title="Switch to the new IRIS design"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Try the new IRIS
          </button>
          <Link href="/account" className="hidden rounded-md px-1 text-right hover:bg-slate-50 sm:block" title="Account settings">
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs text-slate-500">{profile?.email ?? ""}</p>
          </Link>
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
            onClick={logout}
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
