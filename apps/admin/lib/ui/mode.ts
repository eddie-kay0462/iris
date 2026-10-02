/**
 * Interface-mode constants, shared by the server (root layout reads the
 * cookies) and the client (UiModeContext writes them). Kept out of the
 * "use client" module so the server can call the parsers.
 */
export type UiMode = "classic" | "new";
/** The saved preference. "system" follows the OS light/dark setting. */
export type UiTheme = "light" | "dark" | "system";
/** What's actually on screen once "system" is resolved. */
export type ResolvedTheme = "light" | "dark";

export const UI_COOKIE = "iris_ui";
export const THEME_COOKIE = "iris_theme";
/** Set at login; while present, the shell asks which interface to use. */
export const PROMPT_COOKIE = "iris_ui_prompt";

export const ONE_YEAR = 60 * 60 * 24 * 365;

export function parseUiMode(v: string | undefined): UiMode {
  return v === "new" ? "new" : "classic";
}

/** No cookie (or an unknown value) means "system": the default. */
export function parseUiTheme(v: string | undefined): UiTheme {
  return v === "dark" || v === "light" ? v : "system";
}

/**
 * The server can't see the OS setting, so for "system" it renders light and
 * this runs in <head>, before first paint, to swap in the real value. Without
 * it a dark-mode OS would flash light on every page load.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=document.documentElement;if(d.dataset.themePref!=="system")return;var t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.dataset.theme=t;if(d.dataset.ui==="new")d.style.colorScheme=t;}catch(e){}})();`;

