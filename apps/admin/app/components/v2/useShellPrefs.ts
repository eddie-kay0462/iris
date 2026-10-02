"use client";

import { useCallback, useEffect, useState } from "react";

export type Favorite = { href: string; label: string };

const KEY = "iris_shell_prefs";

type Prefs = {
  sidebarOpen: boolean;
  /** Right notification bar on wide screens. Below xl it's a drawer that starts closed. */
  panelOpen: boolean;
  favorites: Favorite[];
  /** ISO time the notifications were last looked at, for the bell's dot. */
  notificationsSeenAt: string | null;
};

const DEFAULTS: Prefs = {
  sidebarOpen: true,
  panelOpen: true,
  favorites: [],
  notificationsSeenAt: null,
};

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/**
 * Per-browser layout preferences for the new IRIS shell. Reads after mount so
 * the server render (defaults) and first client render agree.
 */
export function useShellPrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    setPrefs(load());
  }, []);

  const update = useCallback((patch: Partial<Prefs> | ((p: Prefs) => Partial<Prefs>)) => {
    setPrefs((prev) => {
      const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); prefs just won't persist.
      }
      return next;
    });
  }, []);

  const toggleFavorite = useCallback(
    (fav: Favorite) =>
      update((p) => ({
        favorites: p.favorites.some((f) => f.href === fav.href)
          ? p.favorites.filter((f) => f.href !== fav.href)
          : [...p.favorites, fav],
      })),
    [update],
  );

  return { prefs, update, toggleFavorite };
}
