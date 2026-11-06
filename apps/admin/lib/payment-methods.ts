const LABELS: Record<string, string> = {
  cash: "Cash",
  momo: "MoMo",
  bank_transfer: "Bank Transfer",
  card: "Card",
  split: "Split",
};

/**
 * Display name for a stored payment method ("bank_transfer" → "Bank Transfer").
 * Unknown values fall back to title case with underscores as spaces, so a new
 * method still reads sensibly before it gets a label here. The CSS
 * `capitalize` class can't do this: it gives "Bank_transfer" and "Momo".
 */
export function paymentMethodLabel(method: string | null | undefined, empty = "—"): string {
  if (!method) return empty;
  return (
    LABELS[method] ??
    method
      .split("_")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}
