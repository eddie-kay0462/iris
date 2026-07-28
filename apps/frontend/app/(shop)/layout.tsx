import { getAnnouncementBanner } from "@/lib/api/settings.server";
import ShopLayoutClient from "./ShopLayoutClient";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialBanner = await getAnnouncementBanner();
  return <ShopLayoutClient initialBanner={initialBanner}>{children}</ShopLayoutClient>;
}
