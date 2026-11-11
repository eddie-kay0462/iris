/**
 * Road to HQ deadline, shared by the server page (first paint) and the client
 * (live refresh). Kept out of the "use client" module so the server component
 * can call it directly rather than receiving a client reference.
 */
export const DEADLINE_ISO = "2026-12-26";

/** Whole days from `now` until the deadline, never below zero. */
export function daysUntilDeadline(now: number = Date.now()): number {
  const target = new Date(DEADLINE_ISO + "T00:00:00").getTime();
  return Math.max(0, Math.ceil((target - now) / 86400000));
}
