"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

/**
 * The admin's light / dark / system theme. The choice lives in a cookie so the
 * server renders the right `data-theme` on <html> and there's no flash on load.
 */
import { ONE_YEAR, THEME_COOKIE, type ResolvedTheme, type UiTheme } from "./mode";

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
  html.style.colorScheme = resolved;
}

type UiModeValue = {
  /** The saved preference, including "system". Use for the theme control. */
  theme: UiTheme;
  /** What's on screen: "system" resolved to light or dark. Use for styling. */
  resolvedTheme: ResolvedTheme;
  /** Switches light / dark / system in place; no reload needed. */
  setTheme: (theme: UiTheme) => void;
};

const UiModeContext = createContext<UiModeValue>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
});

export function UiModeProvider({
  initialTheme,
  children,
}: {
  initialTheme: UiTheme;
  children: ReactNode;
}) {
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

  const setTheme = useCallback((t: UiTheme) => {
    writeCookie(THEME_COOKIE, t);
    const resolved = t === "system" ? systemTheme() : t;
    applyTheme(t, resolved);
    setThemeState(t);
    setResolvedTheme(resolved);
  }, []);

  return (
    <UiModeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </UiModeContext.Provider>
  );
}

export function useUiMode(): UiModeValue {
  return useContext(UiModeContext);
}
