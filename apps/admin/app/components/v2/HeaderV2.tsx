"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Camera,
  LogOut,
  Monitor,
  Moon,
  PanelLeft,
  PanelRight,
  Search,
  Star,
  Sun,
  Undo2,
  UserCog,
} from "lucide-react";
import { Avatar } from "../Avatar";
import { breadcrumbFor } from "../nav";
import { useUiMode, type UiTheme } from "@/lib/ui/UiModeContext";

/** The theme control cycles System → Light → Dark. */
const THEME_CYCLE: Record<UiTheme, { next: UiTheme; label: string; icon: typeof Sun }> = {
  system: { next: "light", label: "System", icon: Monitor },
  light: { next: "dark", label: "Light", icon: Sun },
  dark: { next: "system", label: "Dark", icon: Moon },
};

type HeaderV2Props = {
  onToggleSidebar: () => void;
  onTogglePanel: () => void;
  onOpenSearch: () => void;
  hasUnseen: boolean;
  isFavorite: boolean;
  onToggleFavorite: (label: string) => void;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  avatarUploading: boolean;
  onChangeAvatar: (file: File) => Promise<void>;
  loggingOut: boolean;
  onLogout: () => void;
};

export function HeaderV2(props: HeaderV2Props) {
  const pathname = usePathname();
  const crumbs = breadcrumbFor(pathname);
  const pageLabel = crumbs[crumbs.length - 1]?.label ?? "Page";
  const { theme, resolvedTheme, setTheme } = useUiMode();
  const themeStep = THEME_CYCLE[theme];
  const ThemeIcon = themeStep.icon;
  // Read after mount so server and client agree on the first render.
  const [isMac, setIsMac] = useState(true);
  useEffect(() => setIsMac(/Mac|iPhone|iPad/i.test(navigator.userAgent)), []);

  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--iris-line)] bg-[var(--iris-bg)] px-3 py-3 sm:gap-4 sm:px-7 sm:py-5">
      <div className="flex min-w-0 items-center gap-1 sm:gap-2">
        <IconButton label="Toggle sidebar" onClick={props.onToggleSidebar}>
          <PanelLeft className="h-5 w-5" strokeWidth={1.5} />
        </IconButton>
        <IconButton
          label={props.isFavorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => props.onToggleFavorite(pageLabel)}
          className="hidden sm:flex"
        >
          <Star
            className={`h-5 w-5 ${props.isFavorite ? "fill-current" : ""}`}
            strokeWidth={1.5}
          />
        </IconButton>
        <nav aria-label="Breadcrumb" className="ml-1 flex min-w-0 items-center gap-2 text-sm sm:ml-2">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={`${c.href}-${i}`} className="flex min-w-0 items-center gap-2">
                {i > 0 && <span className="hidden text-[var(--iris-faint)] sm:inline">/</span>}
                {last ? (
                  <span className="truncate px-2 py-1 text-slate-900">{c.label}</span>
                ) : (
                  <Link
                    href={c.href}
                    className="hidden truncate rounded-lg px-2 py-1 text-[var(--iris-muted)] hover:bg-[var(--iris-hover)] hover:text-slate-900 pointer-coarse:py-2 sm:inline"
                  >
                    {c.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-5">
        <button
          onClick={props.onOpenSearch}
          className="hidden h-7 w-40 items-center gap-2 rounded-lg bg-[var(--iris-hover)] px-2 text-sm text-[var(--iris-faint)] transition-colors hover:text-[var(--iris-muted)] pointer-coarse:h-9 lg:flex xl:w-48"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="font-sans text-xs">{isMac ? "⌘" : "Ctrl "}/</kbd>
        </button>
        <IconButton label="Search" onClick={props.onOpenSearch} className="lg:hidden">
          <Search className="h-5 w-5" strokeWidth={1.5} />
        </IconButton>

        <div className="flex items-center gap-1 sm:gap-2">
          <IconButton
            label={`Theme: ${themeStep.label}${theme === "system" ? ` (${resolvedTheme})` : ""}. Switch to ${THEME_CYCLE[themeStep.next].label}`}
            onClick={() => setTheme(themeStep.next)}
          >
            <ThemeIcon className="h-5 w-5" strokeWidth={1.5} />
          </IconButton>
          <IconButton label="Notifications" onClick={props.onTogglePanel}>
            <span className="relative">
              <Bell className="h-5 w-5" strokeWidth={1.5} />
              {props.hasUnseen && (
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-slate-900 ring-2 ring-[var(--iris-bg)]" />
              )}
            </span>
          </IconButton>
          <IconButton label="Toggle notification panel" onClick={props.onTogglePanel} className="hidden xl:flex">
            <PanelRight className="h-5 w-5" strokeWidth={1.5} />
          </IconButton>
          <AccountMenu {...props} />
        </div>
      </div>
    </header>
  );
}

function IconButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-slate-900 transition-colors hover:bg-[var(--iris-hover)] pointer-coarse:h-9 pointer-coarse:w-9 ${className}`}
    >
      {children}
    </button>
  );
}

function AccountMenu({
  displayName,
  email,
  avatarUrl,
  avatarUploading,
  onChangeAvatar,
  loggingOut,
  onLogout,
}: HeaderV2Props) {
  const { setUi } = useUiMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex rounded-full ring-offset-2 ring-offset-[var(--iris-bg)] transition hover:ring-2 hover:ring-[var(--iris-line)] pointer-coarse:p-1"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <Avatar url={avatarUrl} name={displayName} size={28} />
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-50 w-60 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[var(--iris-line)] bg-[var(--iris-bg)] p-2 shadow-xl">
          <div className="px-2 py-2">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-[var(--iris-muted)]">{email ?? ""}</p>
          </div>
          <div className="my-1 h-px bg-[var(--iris-line)]" />
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-900 transition-colors hover:bg-[var(--iris-hover)]"
          >
            <UserCog className="h-4 w-4" />
            Account settings
          </Link>
          <MenuItem onClick={() => fileRef.current?.click()} disabled={avatarUploading}>
            <Camera className="h-4 w-4" />
            {avatarUploading ? "Uploading…" : "Change photo"}
          </MenuItem>
          <MenuItem onClick={() => setUi("classic")}>
            <Undo2 className="h-4 w-4" />
            Switch to classic IRIS
          </MenuItem>
          <MenuItem onClick={onLogout} disabled={loggingOut}>
            <LogOut className="h-4 w-4" />
            {loggingOut ? "Signing out…" : "Sign out"}
          </MenuItem>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await onChangeAvatar(file);
              e.target.value = "";
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-slate-900 transition-colors hover:bg-[var(--iris-hover)] disabled:opacity-50"
    >
      {children}
    </button>
  );
}
