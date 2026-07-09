/**
 * Server-side fetch for the Road to HQ progress figures. Runs without the
 * browser `apiClient`; the endpoint is public and unauthenticated. Defensive:
 * returns null on any failure so the homepage still renders (with fallbacks).
 */
import { cache } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface RoadToHQ {
  units: number;
  online: number;
  popup: number;
  allies: number;
  preorders: number;
  baseline: number;
  target: number;
}

export const getRoadToHQ = cache(async (): Promise<RoadToHQ | null> => {
  try {
    const res = await fetch(`${API_BASE_URL}/analytics/road-to-hq`, {
      // Refresh a few times an hour; the counter doesn't need to be real-time.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as RoadToHQ;
  } catch {
    return null;
  }
});
