/**
 * Server-side fetch for the announcement banner. Runs without the browser
 * `apiClient`; the endpoint is public and unauthenticated. Defensive: returns
 * null on any failure so the layout still renders (banner just stays hidden).
 */
import { cache } from "react";
import type { AnnouncementBanner, NewsletterPopup } from "./settings";

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

/**
 * Whether the first-visit newsletter pop-up is switched on. Same defensive
 * contract as above: any failure means "off", so the homepage renders clean.
 */
export const getNewsletterPopup = cache(
  async (): Promise<NewsletterPopup> => {
    try {
      const res = await fetch(`${API_BASE_URL}/settings/newsletter-popup`, {
        next: { revalidate: 60 },
      });
      if (!res.ok) return { enabled: false };
      return (await res.json()) as NewsletterPopup;
    } catch {
      return { enabled: false };
    }
  }
);
