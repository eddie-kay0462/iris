/**
 * The parts of a Paystack transaction (from GET /transaction/verify/:ref) that
 * decide whether it actually paid for an order.
 */
export interface PaystackTransaction {
  status: string | null;
  /** Amount charged, in the currency's subunit (pesewas for GHS). */
  amount: number | null;
  currency: string | null;
}

/** Every storefront charge is made in GHS (see CheckoutClient's Paystack config). */
export const STOREFRONT_CURRENCY = 'GHS';

/**
 * True only when Paystack says the charge succeeded, in GHS, for at least the
 * order total.
 *
 * The amount check matters because the storefront's inline Paystack popup takes
 * its amount from the browser: a shopper can edit it and pay 1 pesewa against a
 * real order's reference. Paystack would report that charge as `success`, so a
 * status-only check would mark the order paid.
 */
export function paystackCoversOrder(
  tx: PaystackTransaction | null,
  orderTotal: number | string,
): boolean {
  if (!tx || tx.status !== 'success') return false;
  if ((tx.currency ?? '').toUpperCase() !== STOREFRONT_CURRENCY) return false;

  const totalPesewas = Math.round(Number(orderTotal) * 100);
  if (!Number.isFinite(totalPesewas)) return false;

  if (tx.amount == null) return false;
  const charged = Number(tx.amount);
  if (!Number.isFinite(charged)) return false;

  return charged >= totalPesewas;
}
