"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePaystackPayment } from "react-paystack";
import { useCart } from "@/lib/cart";
import { useCreatePendingOrder, useConfirmPayment } from "@/lib/api/orders";
import { hasToken, getToken } from "@/lib/api/client";
import { PAYSTACK_PUBLIC_KEY } from "@/lib/paystack/client";
import { Check, Pencil } from "lucide-react";

function generateReference() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `IRD-${ts}-${rand}`;
}

function decodeTokenEmail(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.email || null;
  } catch {
    return null;
  }
}

interface ShippingForm {
  fullName: string;
  address: string;
  email: string;
  label: string;
  phone: string;
  state: string;
  postalCode: string;
}

const EMPTY_FORM: ShippingForm = {
  fullName: "",
  address: "",
  email: "",
  label: "",
  phone: "",
  state: "",
  postalCode: "",
};

const SHIPPING_OPTIONS = [
  {
    id: "standard",
    label: "No rush shipping",
    estimate: "5-7 business days",
    price: 40,
  },
  {
    id: "express",
    label: "Express",
    estimate: "2-3 business days",
    price: 68,
  },
  {
    id: "pickup",
    label: "Pickup",
    estimate: "Collect at our location — no delivery fee",
    price: 0,
  },
];

function validateForm(form: ShippingForm, isPickup: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.fullName.trim()) errors.fullName = "Full name is required";
  if (!form.phone.trim()) errors.phone = "Phone number is required";
  if (!isPickup) {
    if (!form.address.trim()) errors.address = "Address is required";
    if (!form.state.trim()) errors.state = "State is required";
  }
  return errors;
}

function PayNowButton({
  email,
  amount,
  reference,
  onSuccess,
  onClose,
  onBeforeOpen,
  disabled,
}: {
  email: string;
  amount: number;
  reference: string;
  onSuccess: (ref: any) => void;
  onClose: () => void;
  onBeforeOpen: () => Promise<boolean>;
  disabled: boolean;
}) {
  const config = {
    email,
    amount: Math.round(amount * 100),
    currency: "GHS",
    reference,
    publicKey: PAYSTACK_PUBLIC_KEY,
  };

  const initializePayment = usePaystackPayment(config);

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await onBeforeOpen();
        if (!ok) return;
        initializePayment({ onSuccess, onClose });
      }}
      disabled={disabled}
      className="w-full rounded-md bg-gray-900 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-gray-100 dark:disabled:bg-gray-700"
    >
      {disabled ? "Processing..." : "Pay Now"}
    </button>
  );
}

export default function CheckoutClient() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const createPendingOrder = useCreatePendingOrder();
  const confirmPayment = useConfirmPayment();
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [shippingOption, setShippingOption] = useState("standard");
  const [promoCode, setPromoCode] = useState("");

  const shippingCost =
    SHIPPING_OPTIONS.find((o) => o.id === shippingOption)?.price ?? 40;
  const total = subtotal + shippingCost;

  useEffect(() => {
    if (!hasToken()) {
      router.push(`/login?redirect=/checkout`);
      return;
    }
    const token = getToken();
    if (token) {
      const decoded = decodeTokenEmail(token);
      if (decoded) {
        setEmail(decoded);
        setForm((prev) => ({ ...prev, email: decoded }));
      }
    }
    setReference(generateReference());
    setAuthChecked(true);
  }, [router]);

  if (!authChecked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-gray-500 dark:text-gray-400">
        Checking authentication...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your cart is empty
        </h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          Add items to your cart before checking out.
        </p>
      </div>
    );
  }

  function handleChange(field: keyof ShippingForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  /**
   * Step 1 — runs on Pay Now click, BEFORE Paystack opens.
   * Validates the form, then pre-creates the order in `pending` state on the
   * backend so the customer can never pay without an order existing first.
   * Returns true only if both validation and order creation succeed.
   */
  async function handleValidateAndPay(): Promise<boolean> {
    setCreateError(null);

    const validationErrors = validateForm(form, shippingOption === "pickup");
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }

    setProcessing(true);
    try {
      const order = await createPendingOrder.mutateAsync({
        items: items.map((i) => ({
          variantId: i.variantId,
          productId: i.productId,
          productTitle: i.productTitle,
          variantTitle: i.variantTitle || undefined,
          price: i.price,
          quantity: i.quantity,
        })),
        shippingAddress: {
          fullName: form.fullName,
          address: shippingOption === "pickup" ? "Pickup" : form.address,
          address2:
            shippingOption === "pickup" ? undefined : form.label || undefined,
          city: shippingOption === "pickup" ? "Pickup" : form.state,
          region: shippingOption === "pickup" ? "Pickup" : form.state,
          postalCode:
            shippingOption === "pickup"
              ? undefined
              : form.postalCode || undefined,
          phone: form.phone,
        },
        paymentReference: reference,
      });

      setPendingOrderNumber(order.order_number);
      return true;
    } catch (err: any) {
      setCreateError(
        err?.message || "Could not start your order. Please try again.",
      );
      setProcessing(false);
      return false;
    }
  }

  /**
   * Step 2 — runs after Paystack reports a successful charge.
   * Confirms the order on the backend (idempotent — the Paystack webhook also
   * confirms the same reference as a safety net).
   */
  async function handlePaymentSuccess() {
    try {
      await confirmPayment.mutateAsync(reference);
    } catch {
      // Don't block the redirect: the webhook will still finalize the order.
    } finally {
      clearCart();
      const orderNum = pendingOrderNumber ?? reference;
      router.push(`/checkout/confirmation?order=${orderNum}`);
    }
  }

  function handlePaymentClose() {
    // Customer closed the Paystack modal without paying. The pending order
    // still exists on the backend; allow them to retry without re-creating.
    setProcessing(false);
  }

  const inputClass =
    "w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-white dark:focus:ring-white";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* ── Left Column: Form ── */}
        <div className="px-6 py-8 lg:px-12 lg:py-10">
          {/* Step 1: Customer */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="h-4 w-4" />
                </span>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Customer
                </h2>
              </div>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <p className="ml-10 mt-1 text-sm text-gray-500 dark:text-gray-400">
              {email}
            </p>
          </div>

          {/* Step 2: Delivery */}
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white dark:bg-white dark:text-black">
                2
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Delivery
              </h2>
            </div>

            <p className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
              {shippingOption === "pickup" ? "Your details" : "Shipping address"}
            </p>

            <div className="space-y-4">
              {/* Row: Full name / Address */}
              <div className={`grid gap-4 ${shippingOption === "pickup" ? "grid-cols-1" : "grid-cols-2"}`}>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    placeholder="Full name"
                    className={inputClass}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.fullName}
                    </p>
                  )}
                </div>
                {shippingOption !== "pickup" && (
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                      Address
                    </label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => handleChange("address", e.target.value)}
                      placeholder="Address"
                      className={inputClass}
                    />
                    {errors.address && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.address}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Row: Email / Label — hidden for pickup */}
              {shippingOption !== "pickup" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="Email"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                      Label
                    </label>
                    <input
                      type="text"
                      value={form.label}
                      onChange={(e) => handleChange("label", e.target.value)}
                      placeholder="Label (e.g. Home, Office)"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* Row: Phone / State */}
              <div className={`grid gap-4 ${shippingOption === "pickup" ? "grid-cols-1" : "grid-cols-2"}`}>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                    Phone number
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="Phone number"
                    className={inputClass}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                  )}
                </div>
                {shippingOption !== "pickup" && (
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                      State
                    </label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      placeholder="State"
                      className={inputClass}
                    />
                    {errors.state && (
                      <p className="mt-1 text-xs text-red-500">{errors.state}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Row: Postal code — hidden for pickup */}
              {shippingOption !== "pickup" && (
                <div className="w-1/2 pr-2">
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                    Postal code
                  </label>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={(e) => handleChange("postalCode", e.target.value)}
                    placeholder="Postal code"
                    className={inputClass}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Payment */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white dark:bg-white dark:text-black">
                3
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Payment
              </h2>
            </div>

            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              You will be securely redirected to Paystack to complete your
              payment.
            </p>

            {Object.keys(errors).length > 0 && (
              <p className="mb-4 text-sm text-red-500">
                Please fill in all required delivery fields above.
              </p>
            )}

            {createError && (
              <p className="mb-4 text-sm text-red-500">{createError}</p>
            )}

            <PayNowButton
              email={email}
              amount={total}
              reference={reference}
              disabled={processing}
              onBeforeOpen={handleValidateAndPay}
              onSuccess={handlePaymentSuccess}
              onClose={handlePaymentClose}
            />
          </div>
        </div>

        {/* ── Right Column: Order Summary ── */}
        <div className="border-l border-gray-200 bg-gray-50 px-6 py-8 dark:border-gray-800 dark:bg-gray-900 lg:px-12 lg:py-10">
          <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
            Order Summary
          </h2>

          {/* Product list */}
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.variantId} className="flex gap-4">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.productTitle}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-md bg-gray-200 text-xs text-gray-400 dark:bg-gray-800">
                    No image
                  </div>
                )}
                <div className="flex flex-1 items-start justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase text-gray-900 dark:text-white">
                      {item.productTitle}
                    </p>
                    {item.variantTitle && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {item.variantTitle}
                      </p>
                    )}
                    {item.quantity > 1 && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Qty: {item.quantity}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    GH₵{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Summary breakdown */}
          <div className="mt-6 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
            <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Summary
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Subtotal
              </span>
              <span className="text-gray-900 dark:text-white">
                GH₵ {subtotal.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Taxes</span>
              <span className="text-gray-900 dark:text-white">Included</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Shipping/Delivery
              </span>
              <span className={shippingOption === "pickup" ? "font-medium text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}>
                {shippingOption === "pickup" ? "Free" : `GH₵ ${shippingCost.toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3 text-sm font-semibold dark:border-gray-700">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-gray-900 dark:text-white">
                GH₵ {total.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Promo code */}
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              Add a promo code
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder=""
                className="flex-1 rounded-md border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-white"
              />
              <button className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                Apply
              </button>
            </div>
          </div>

          {/* Delivery options */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Delivery is estimated for
            </p>
            <div className="space-y-3">
              {SHIPPING_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition ${
                    shippingOption === option.id
                      ? "border-gray-900 bg-white dark:border-white dark:bg-gray-800"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={shippingOption === option.id}
                      onChange={() => setShippingOption(option.id)}
                      className="h-4 w-4 accent-gray-900 dark:accent-white"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Estimated delivery, {option.estimate}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    GH₵ {option.price.toLocaleString()}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
