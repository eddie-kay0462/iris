"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Camera, Clock, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "../../components/Avatar";
import { useAdminProfile } from "@/lib/hooks/useAdminProfile";
import { useRole, useCan } from "@/lib/rbac/RoleContext";
import {
  PERMISSIONS,
  PERMISSION_AREA_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  getPermissionsForRole,
  type Permission,
} from "@/lib/rbac/permissions";
import { useUiMode, type UiTheme } from "@/lib/ui/UiModeContext";
import { sessionExpiry } from "@/lib/auth/sessionExpiry";

/**
 * Account settings — your own profile, preferences and session (ported from
 * the Gold Coast Tokota admin's account page). Separate from the profile
 * modal, which is a quick glance and a role preview; this is where you change
 * things about yourself.
 */

const THEME_OPTIONS: { value: UiTheme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match my system" },
];

function Section({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="p-4 md:p-5">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-slate-200 px-4 py-3 md:px-5">{footer}</div>
      )}
    </section>
  );
}

function Field({
  label,
  hint,
  className = "",
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      <input
        {...input}
        className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
      />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

/** "popup:create" → "Create"; the area is shown as the group heading. */
function actionLabel(p: Permission) {
  const action = p.split(":")[1] ?? p;
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export default function AccountPage() {
  const { profile, displayName, avatarUrl, avatarUploading, changeAvatar, updateProfile, loggingOut, logout } =
    useAdminProfile();
  const role = useRole();
  const canSeeRoles = useCan("settings:read");
  const { ui, theme, resolvedTheme, setTheme, setUi } = useUiMode();
  const isNew = ui === "new";

  // Profile form, filled once the profile loads.
  const [form, setForm] = useState({ first_name: "", last_name: "", phone_number: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      phone_number: profile.phone_number ?? "",
    });
  }, [profile]);
  const dirty =
    !!profile &&
    (form.first_name !== (profile.first_name ?? "") ||
      form.last_name !== (profile.last_name ?? "") ||
      form.phone_number !== (profile.phone_number ?? ""));

  async function save() {
    setSaving(true);
    try {
      await updateProfile({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        ...(form.phone_number.trim() ? { phone_number: form.phone_number.trim() } : {}),
      });
      toast.success("Profile saved.");
    } catch (err) {
      const e = err as { data?: { message?: string | string[] } };
      const msg = Array.isArray(e?.data?.message) ? e.data.message.join(", ") : e?.data?.message;
      toast.error(msg || "Couldn't save your profile. Please try again.", { duration: 6000 });
    } finally {
      setSaving(false);
    }
  }

  const fileRef = useRef<HTMLInputElement>(null);

  // Read after mount: the expiry comes from a browser cookie.
  const [expires, setExpires] = useState<Date | null>(null);
  useEffect(() => setExpires(sessionExpiry()), []);

  /** Permissions for the role in effect, grouped by area so they read as parts of the app. */
  const granted = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of getPermissionsForRole(role)) {
      const area = p.split(":")[0];
      map.set(area, [...(map.get(area) ?? []), p]);
    }
    return [...map.entries()].map(([area, perms]) => ({ area: PERMISSION_AREA_LABELS[area] ?? area, perms }));
  }, [role]);

  const choiceClass = (selected: boolean) =>
    `rounded-lg border px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
      selected
        ? "border-slate-900 bg-slate-100 font-medium text-slate-900"
        : "border-slate-200 text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className={isNew ? "text-xl font-semibold text-slate-900" : "text-2xl font-semibold"}>Account</h1>
        <p className="text-sm text-slate-500">Your profile, preferences and session.</p>
      </header>

      {/* Profile */}
      <Section
        title="Profile"
        footer={
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving || !form.first_name.trim()}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <label className="group relative cursor-pointer rounded-full" title="Change profile photo">
            <Avatar url={avatarUrl} name={displayName} size={64} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 pointer-coarse:opacity-100">
              <Camera className="h-4 w-4 text-white" />
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={avatarUploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await changeAvatar(file);
                e.target.value = "";
              }}
            />
          </label>
          <div className="min-w-0">
            <p className="text-base text-slate-900">{displayName}</p>
            <p className="text-sm text-slate-500">
              {avatarUploading ? "Uploading photo…" : ROLE_LABELS[role]}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field
            label="First name"
            value={form.first_name}
            onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
            autoComplete="given-name"
          />
          <Field
            label="Last name"
            value={form.last_name}
            onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
            autoComplete="family-name"
          />
          <Field
            label="Phone number"
            type="tel"
            value={form.phone_number}
            onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))}
            placeholder="+233 24 000 0000"
            autoComplete="tel"
          />
          <Field
            label="Email address"
            type="email"
            value={profile?.email ?? ""}
            disabled
            hint="Your sign-in address. Ask an Admin if it needs to change."
          />
        </div>
      </Section>

      {/* Appearance and Session side by side on wide screens */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <Section
          title="Appearance"
          description={
            isNew
              ? `Currently rendering in ${resolvedTheme} mode.`
              : "Light and dark mode are part of the new IRIS."
          }
        >
          <p className="mb-2 text-xs font-medium text-slate-600">Theme</p>
          <div className="flex flex-wrap gap-2">
            {THEME_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                disabled={!isNew}
                onClick={() => setTheme(o.value)}
                className={choiceClass(isNew && theme === o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            “Match my system” follows your operating system live, so the dashboard dims when your
            machine does.
          </p>

          <p className="mb-2 mt-5 text-xs font-medium text-slate-600">Interface</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setUi("new")} className={choiceClass(isNew)}>
              New IRIS
            </button>
            <button type="button" onClick={() => setUi("classic")} className={choiceClass(!isNew)}>
              Classic
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Switching reloads the page. Same data either way.</p>
        </Section>

        {/* Session */}
        <Section
          title="Session"
          footer={
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          }
        >
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-100 px-4 py-3">
            <Clock className="h-[18px] w-[18px] shrink-0 text-slate-400" />
            <p className="min-w-0 flex-1 text-sm text-slate-700 [overflow-wrap:anywhere]">
              Signed in as {profile?.email ?? "…"}.
              {expires && (
                <>
                  {" "}
                  Your session ends{" "}
                  {expires.toLocaleString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  , after which you&apos;ll be asked to sign in again.
                </>
              )}
            </p>
          </div>
        </Section>
      </div>

      {/* Access */}
      <Section
        title="Access"
        description={
          <>
            You are signed in as <span className="font-medium text-slate-700">{ROLE_LABELS[role]}</span>.
          </>
        }
      >
        <p className="text-sm text-slate-600">{ROLE_DESCRIPTIONS[role]}</p>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-600">What you can do</p>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            {granted.map((g) => (
              <div key={g.area}>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{g.area}</p>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {g.perms.map((p) => (
                    <li key={p}>
                      <span
                        title={PERMISSIONS[p]}
                        className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600"
                      >
                        {actionLabel(p)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Need something that isn&apos;t here? Ask an Admin
            {canSeeRoles && (
              <>
                {" "}— see{" "}
                <Link href="/settings/roles" className="text-slate-900 underline underline-offset-4">
                  Roles
                </Link>{" "}
                for what each tier covers
              </>
            )}
            .
          </p>
        </div>
      </Section>
    </section>
  );
}
