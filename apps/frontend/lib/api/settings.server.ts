/**
 * Server-side fetch for the announcement banner. Runs without the browser
 * `apiClient`; the endpoint is public and unauthenticated. Defensive: returns
 * null on any failure so the layout still renders (banner just stays hidden).
 */
import { cache } from "react";
import type { AnnouncementBanner } from "./settings";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export const getAnnouncementBanner = cache(
  async (): Promise<AnnouncementBanner | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/announcement-banner`, {
        next: { revalidate: 60 },
      });
      if (!res.ok) return null;
      return (await res.json()) as AnnouncementBanner;
    } catch {
      return null;
    }
  }
);
