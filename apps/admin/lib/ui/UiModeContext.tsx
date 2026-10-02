"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * Which admin interface is showing: the classic one or the "new IRIS"
 * redesign. The choice lives in cookies so the server renders the right
 * `data-ui` / `data-theme` on <html> and there's no flash on load.
 */
import {
  ONE_YEAR,
  THEME_COOKIE,
  UI_COOKIE,
  type ResolvedTheme,
  type UiMode,
  type UiTheme,
} from "./mode";

export * from "./mode";

/** `maxAge: null` writes a session cookie (gone when the browser closes). */
export function writeCookie(name: string, value: string, maxAge: number | null = ONE_YEAR) {
  const age = maxAge === null ? "" : `; max-age=${maxAge}`;
  document.cookie = `${name}=${value}; path=/${age}; SameSite=Lax`;
}

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`))
    ?.split("=")[1];
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Puts the resolved theme on <html>, where the CSS (and `dark:`) reads it. */
function applyTheme(pref: UiTheme, resolved: ResolvedTheme) {
  const html = document.documentElement;
  html.dataset.themePref = pref;
  html.dataset.theme = resolved;
  html.style.colorScheme = html.dataset.ui === "new" ? resolved : "light";
}

type UiModeValue = {
  ui: UiMode;
  /** The saved preference, including "system". Use for the theme control. */
  theme: UiTheme;
  /** What's on screen: "system" resolved to light or dark. Use for styling. */
  resolvedTheme: ResolvedTheme;
  /** Persists the interface choice and reloads so every page picks it up. */
  setUi: (mode: UiMode) => void;
  /** Switches light / dark / system in place; no reload needed. */
  setTheme: (theme: UiTheme) => void;
};

const UiModeContext = createContext<UiModeValue>({
  ui: "classic",
  theme: "system",
  resolvedTheme: "light",
  setUi: () => {},
  setTheme: () => {},
});

export function UiModeProvider({
  initialUi,
  initialTheme,
  children,
}: {
  initialUi: UiMode;
  initialTheme: UiTheme;
  children: ReactNode;
}) {
  const [ui] = useState(initialUi);
  const [theme, setThemeState] = useState(initialTheme);
  // Starts as what the server rendered ("system" → light) so hydration
  // matches; the effect below corrects it to the OS value straight away.
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    initialTheme === "system" ? "light" : initialTheme,
  );

  // While on "system", follow the OS, including changes made with the app open.
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia(DARK_QUERY);
    const sync = () => {
      const t = mq.matches ? "dark" : "light";
      applyTheme("system", t);
      setResolvedTheme(t);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [theme]);

  const setUi = useCallback(
    (mode: UiMode) => {
      writeCookie(UI_COOKIE, mode);
      if (mode !== ui) window.location.reload();
    },
    [ui],
  );

  const setTheme = useCallback((t: UiTheme) => {
    writeCookie(THEME_COOKIE, t);
    const resolved = t === "system" ? systemTheme() : t;
    applyTheme(t, resolved);
    setThemeState(t);
    setResolvedTheme(resolved);
  }, []);

  return (
    <UiModeContext.Provider value={{ ui, theme, resolvedTheme, setUi, setTheme }}>
      {children}
    </UiModeContext.Provider>
  );
}

export function useUiMode(): UiModeValue {
  return useContext(UiModeContext);
}

/** True when the "new IRIS" interface is active. */
export function useIsNewUi(): boolean {
  return useContext(UiModeContext).ui === "new";
}
