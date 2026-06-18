"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/tracker";

/** Fires a page_view (and product_view on product pages) on every route change. */
export default function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    track("page_view");
    if (/^\/product\/[^/]+/.test(pathname)) {
      track("product_view");
    }
  }, [pathname]);

  return null;
}
