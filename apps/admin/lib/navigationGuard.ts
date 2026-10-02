/**
 * In-app navigations that don't come from a link click (e.g. the ⌘/ page
 * search, which calls router.push) announce themselves here first, so a page
 * with unsaved work can intercept them. Dispatch with `requestNavigation`;
 * listeners call `preventDefault()` to stop the jump and handle it themselves.
 */
export const BEFORE_NAVIGATE_EVENT = "iris:before-navigate";

/** True if nothing objected and the caller may navigate. */
export function requestNavigation(href: string): boolean {
  if (typeof window === "undefined") return true;
  return window.dispatchEvent(new CustomEvent(BEFORE_NAVIGATE_EVENT, { detail: { href }, cancelable: true }));
}
