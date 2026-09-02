"use client";

import { useCart } from "@/lib/cart";
import { useLocale } from "@/lib/locale/locale-provider";
import { useVolumeOffers } from "@/lib/api/promos";
import { bestVolumeNudge, nudgeMessage } from "@/lib/bundles/volume-nudge";

/**
 * "Add 1 more item to save 15%" — shown above the cart subtotal.
 *
 * Renders nothing when there is no offer to chase, when the feed fails, or once
 * the top tier is cleared. The discount itself is applied by the server at
 * checkout; this is only the prompt.
 */
export default function VolumeNudge({ className = "" }: { className?: string }) {
  const { items } = useCart();
  const { formatPrice } = useLocale();
  const { data: offers } = useVolumeOffers();

  const nudge = bestVolumeNudge(offers ?? [], items);
  if (!nudge) return null;

  return (
    <p className={className}>
      {nudgeMessage(nudge, formatPrice)}
    </p>
  );
}
