"use client";

import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { Avatar } from "../Avatar";
import { Modal } from "./Modal";
import { useRole } from "@/lib/rbac/RoleContext";
import { ROLE_LABELS } from "@/lib/rbac/permissions";
import { sessionExpiry } from "@/lib/auth/sessionExpiry";

/**
 * "Your account" — opened from the user tile at the top of the sidebar
 * (ported from the Gold Coast Tokota admin's ProfileModal). A quick glance at
 * who you're signed in as, with the way to account settings and to sign out.
 */
export function ProfileModal({
  open,
  onClose,
  displayName,
  email,
  avatarUrl,
  loggingOut,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  loggingOut: boolean;
  onLogout: () => void;
}) {
  const role = useRole();
  const expires = sessionExpiry();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your account"
      footer={
        <>
          <Link
            href="/account"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--iris-line)] px-4 text-sm font-medium text-slate-900 transition-colors hover:bg-[var(--iris-hover)]"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
            Account settings
          </Link>
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm text-slate-600 transition-colors hover:bg-[var(--iris-hover)] hover:text-slate-900 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Identity */}
        <div className="flex items-center gap-3">
          <Avatar url={avatarUrl} name={displayName} size={56} />
          <div className="min-w-0">
            <p className="truncate text-base font-medium text-slate-900">{displayName}</p>
            <p className="truncate text-sm text-slate-600">{ROLE_LABELS[role]}</p>
            <p className="truncate text-xs text-[var(--iris-muted)]">{email ?? ""}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--iris-line)] pt-4 text-sm">
          <div>
            <dt className="text-xs text-[var(--iris-muted)]">Role</dt>
            <dd className="mt-0.5 text-slate-900">{ROLE_LABELS[role]}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--iris-muted)]">Session</dt>
            <dd className="mt-0.5 text-slate-900">
              {expires
                ? `Until ${expires.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                : "Signed in"}
            </dd>
          </div>
        </dl>
      </div>
    </Modal>
  );
}
