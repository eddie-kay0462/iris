"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ROLE_LABELS, type UserRole } from "@/lib/rbac/permissions";
import { RoleProvider } from "@/lib/rbac/RoleContext";
import { ProfileModal } from "./ProfileModal";
import { useAdminProfile } from "@/lib/hooks/useAdminProfile";
import { flattenNav, navGroupsForRole } from "../nav";
import { SidebarV2 } from "./SidebarV2";
import { HeaderV2 } from "./HeaderV2";
import { RightPanel } from "./RightPanel";
import { CommandPalette } from "./CommandPalette";
import { useShellPrefs } from "./useShellPrefs";
import { useNotifications } from "./useNotifications";

const MD = "(min-width: 768px)";
const XL = "(min-width: 1280px)";

/** New IRIS layout: left nav · header + page · right notification bar. */
export function AdminShellV2({ role, children }: { role: UserRole; children: ReactNode }) {
  const pathname = usePathname();
  const profile = useAdminProfile();
  const { prefs, update, toggleFavorite } = useShellPrefs();

  const [profileOpen, setProfileOpen] = useState(false);

  const notifications = useNotifications(role);
  const pages = useMemo(() => flattenNav(navGroupsForRole(role)), [role]);

  const [mobileNav, setMobileNav] = useState(false);
  const [panelDrawer, setPanelDrawer] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Close the drawers on navigation.
  useEffect(() => {
    setMobileNav(false);
    setPanelDrawer(false);
  }, [pathname]);

  // ⌘/ and ⌘K open search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Escape closes whichever drawer is open (phone / tablet).
      if (e.key === "Escape") {
        setMobileNav(false);
        setPanelDrawer(false);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "/" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const panelVisible = panelDrawer || prefs.panelOpen;
  const { latest } = notifications;
  const hasUnseen = !!latest && (!prefs.notificationsSeenAt || latest > prefs.notificationsSeenAt);

  // Seeing the panel marks everything in it as read.
  useEffect(() => {
    if (!latest || !panelVisible) return;
    const wide = window.matchMedia(XL).matches;
    if ((wide && prefs.panelOpen) || panelDrawer) {
      if (!prefs.notificationsSeenAt || latest > prefs.notificationsSeenAt) {
        update({ notificationsSeenAt: latest });
      }
    }
  }, [latest, panelVisible, panelDrawer, prefs.panelOpen, prefs.notificationsSeenAt, update]);

  function toggleSidebar() {
    if (window.matchMedia(MD).matches) update((p) => ({ sidebarOpen: !p.sidebarOpen }));
    else setMobileNav((o) => !o);
  }

  function togglePanel() {
    if (window.matchMedia(XL).matches) update((p) => ({ panelOpen: !p.panelOpen }));
    else setPanelDrawer((o) => !o);
  }

  return (
    <RoleProvider role={role}>
    <div
      className="iris-shell flex h-dvh bg-[var(--iris-bg)] text-slate-900"
      data-sidebar={prefs.sidebarOpen ? "open" : "collapsed"}
      data-panel={prefs.panelOpen ? "open" : "closed"}
    >
      <SidebarV2
        role={role}
        open={prefs.sidebarOpen}
        mobileOpen={mobileNav}
        onMobileClose={() => setMobileNav(false)}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
        favorites={prefs.favorites}
        roleLabel={ROLE_LABELS[role]}
        onOpenProfile={() => {
          setMobileNav(false);
          setProfileOpen(true);
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderV2
          onToggleSidebar={toggleSidebar}
          onTogglePanel={togglePanel}
          onOpenSearch={() => setSearchOpen(true)}
          hasUnseen={hasUnseen}
          isFavorite={prefs.favorites.some((f) => f.href === pathname)}
          onToggleFavorite={(label) => toggleFavorite({ href: pathname, label })}
          displayName={profile.displayName}
          email={profile.profile?.email ?? null}
          avatarUrl={profile.avatarUrl}
          avatarUploading={profile.avatarUploading}
          onChangeAvatar={profile.changeAvatar}
          loggingOut={profile.loggingOut}
          onLogout={profile.logout}
        />
        <main className="iris-main flex-1 overflow-y-auto p-4 sm:p-7">{children}</main>
      </div>
      <RightPanel
        data={notifications}
        open={prefs.panelOpen}
        drawerOpen={panelDrawer}
        onCloseDrawer={() => setPanelDrawer(false)}
      />
      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} items={pages} />
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        displayName={profile.displayName}
        email={profile.profile?.email ?? null}
        avatarUrl={profile.avatarUrl}
        loggingOut={profile.loggingOut}
        onLogout={profile.logout}
      />
    </div>
    </RoleProvider>
  );
}
