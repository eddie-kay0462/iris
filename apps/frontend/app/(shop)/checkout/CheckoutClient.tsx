"use client";

import { outlineButton } from "@/components/ui";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePaystackPayment } from "react-paystack";
import { useCart } from "@/lib/cart";
import { useCreateOrder, confirmPaymentByReference, releaseStockHold, usePreviewFulfillment } from "@/lib/api/orders";
import PhoneInput from "@/components/PhoneInput";
import { useProfile, parseDefaultAddress } from "@/lib/api/profile";
import { apiClient, hasToken, getToken } from "@/lib/api/client";
import { PAYSTACK_PUBLIC_KEY } from "@/lib/paystack/client";
import { useShippingOptions, DEFAULT_SHIPPING_OPTIONS, useCountryShippingRates, usePopupPickup } from "@/lib/api/settings";
import { useValidatePromo, DiscountType } from "@/lib/api/promos";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/lib/locale/locale-provider";
import { track, snapshotCheckout } from "@/lib/analytics/tracker";

function generateReference() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `IRD-${ts}-${rand}`;
}

function StockHoldTimer({ expiresAt }: { expiresAt: string }) {
  const [remainingMs, setRemainingMs] = useState(
    () => new Date(expiresAt).getTime() - Date.now(),
  );

  useEffect(() => {
    setRemainingMs(new Date(expiresAt).getTime() - Date.now());
    const interval = setInterval(() => {
      setRemainingMs(new Date(expiresAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (remainingMs <= 0) {
    return (
      <p className="mt-3 text-xs font-medium text-danger">
        Your item hold has expired. Click &ldquo;Pay Now&rdquo; to try again.
      </p>
    );
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <p className="mt-3 text-xs font-medium text-warning">
      Items reserved for {minutes}:{seconds.toString().padStart(2, "0")} - complete payment before your hold expires.
    </p>
  );
}


// Payment processing fee charged on top of the order amount. Kept in sync with the
// backend (apps/backend/src/orders/orders.service.ts PROCESSING_FEE_RATE) so the
// amount charged via Paystack matches the stored order total.
const PROCESSING_FEE_RATE = 0.0195;

const COUNTRY_OPTIONS = [
  { code: "GH", label: "Ghana", enabled: true },
  { code: "US", label: "United States", enabled: true },
  { code: "CA", label: "Canada", enabled: false },
  { code: "GB", label: "United Kingdom", enabled: false },
  { code: "NL", label: "Netherlands", enabled: false },
] as const;

interface ShippingForm {
  country: string;
  firstName: string;
  lastName: string;
  address: string;
  address2: string;
  phone: string;
  city: string;
  state: string;
  postalCode: string;
}

const EMPTY_FORM: ShippingForm = {
  country: "GH",
  firstName: "",
  lastName: "",
  address: "",
  address2: "",
  phone: "",
  city: "",
  state: "",
  postalCode: "",
};

function validateForm(form: ShippingForm, isPickup: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required";
  if (!form.lastName.trim()) errors.lastName = "Last name is required";
  if (!form.phone) errors.phone = "Phone number is required";
  else if (!/^\+\d{7,15}$/.test(form.phone)) errors.phone = "Enter a valid phone number";
  // Collection needs no address at all — the city input is hidden for pickup, so
  // requiring it here would make the form impossible to submit.
  if (!isPickup && !form.city.trim()) errors.city = "City is required";
  // International (non-Ghana) destinations need a complete postal address to ship.
  if (!isPickup && form.country !== "GH") {
    if (!form.address.trim()) errors.address = "Address is required";
    if (!form.state.trim()) errors.state = "State / province is required";
    if (!form.postalCode.trim()) errors.postalCode = "ZIP / postal code is required";
  }
  return errors;
}

function toPaystackPhone(e164: string): string {
  // Ghana E.164 (+233XXXXXXXXX) → local MoMo format (0XXXXXXXXX)
  // Strip any accidental trunk prefix before re-adding it, so both
  // correctly stored (+233241234567) and legacy (+2330241234567) values work.
  if (e164.startsWith("+233")) return "0" + e164.slice(4).replace(/^0+/, "");
  return e164;
}

function PayNowButton({
  email,
  amount,
  reference,
  phone,
  onSuccess,
  onClose,
  onBeforeOpen,
  disabled,
}: {
  email: string;
  amount: number;
  reference: string;
  phone?: string;
  onSuccess: (ref: any) => void;
  onClose: () => void;
  onBeforeOpen: () => Promise<boolean>;
  disabled: boolean;
}) {
  const phoneRef = React.useRef(phone);
  phoneRef.current = phone;

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
        const currentPhone = phoneRef.current;
        initializePayment({
          onSuccess,
          onClose,
          config: currentPhone ? { email, amount: Math.round(amount * 100), currency: "GHS", reference, phone: toPaystackPhone(currentPhone) } : undefined,
        });
      }}
      disabled={disabled}
      className="w-full rounded-md bg-invert-bg py-3.5 text-sm font-semibold uppercase tracking-wider text-invert-fg transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {disabled ? "Processing..." : "Pay Now"}
    </button>
  );
}

export default function CheckoutClient() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { currency, rates, formatPrice } = useLocale();
  const createOrder = useCreateOrder();
  const [isSignedIn, setIsSignedIn] = useState(false);
  useEffect(() => { setIsSignedIn(hasToken()); }, []);
  const { data: profile } = useProfile(isSignedIn);
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    const token = getToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.email || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [reference, setReference] = useState(() => generateReference());
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [shippingOption, setShippingOption] = useState<"standard" | "express" | "popup_pickup">("standard");
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    promoCodeId: string;
    discountAmount: number;
    discountType: DiscountType;
  } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const validatePromo = useValidatePromo();

  const { data: shippingOptions = DEFAULT_SHIPPING_OPTIONS } = useShippingOptions();
  const { data: countryShippingRates = [] } = useCountryShippingRates();
  const { data: popupPickup } = usePopupPickup();

  // Ghana ships via the tiered domestic options; other countries use the flat
  // per-country rate configured in settings. `internationalRate` is undefined for
  // countries we don't ship to (shouldn't happen — only shippable ones are enabled).
  const isInternational = form.country !== "GH";
  const internationalRate = countryShippingRates.find((r) => r.country === form.country);
  const domesticShippingCost =
    shippingOptions.find((o) => o.id === shippingOption)?.price ?? shippingOptions[0]?.price ?? 40;
  const isPickup = shippingOption === "popup_pickup";
  // Collection at a pop-up costs nothing — unlike every other option. The server
  // independently forces this to 0, so the displayed and charged amounts can't drift.
  const shippingCost = isPickup
    ? 0
    : isInternational
      ? internationalRate?.price ?? 0
      : domesticShippingCost;
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const amountBeforeFees = Math.max(0, subtotal + shippingCost - discountAmount);
  const fees = Math.round(amountBeforeFees * PROCESSING_FEE_RATE * 100) / 100;
  const total = amountBeforeFees + fees;

  // Live fulfillment check: an item added while in stock can sell out before
  // payment, in which case checkout auto-converts it to a pre-order. Flag those
  // here so the badge/notice reflect what will actually happen — not just what
  // was marked at add-to-cart time.
  const { data: fulfillment } = usePreviewFulfillment(
    items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
  );
  const isItemPreorder = (item: { variantId: string; isPreorder?: boolean }) =>
    fulfillment?.[item.variantId] === "preorder" || (!fulfillment && !!item.isPreorder);
  const hasPreorderItems = items.some(isItemPreorder);

  // Collection at the pop-up is the free alternative to waiting for a pre-order
  // to be restocked and shipped, so it's only offered on carts that contain
  // pre-order lines — and only domestically. The pop-up date already accounts
  // for the preparation lead time; past this week's cut-off the API hands back
  // next week's date instead.
  const pickupAvailable =
    !!popupPickup?.enabled && hasPreorderItems && !isInternational;

  // One checkout_started event per checkout visit
  useEffect(() => {
    if (items.length > 0) {
      track("checkout_started", { value: subtotal });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Snapshot the checkout (cart + contact details as typed) for
  // abandoned-checkout capture; debounced so we don't post per keystroke.
  useEffect(() => {
    if (items.length === 0) return;
    const timer = setTimeout(() => {
      snapshotCheckout({
        // `email` is prefilled from the JWT for signed-in users
        email: email.trim() || undefined,
        phone: form.phone || undefined,
        customerName:
          `${form.firstName} ${form.lastName}`.trim() || undefined,
        userId: profile?.id || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productTitle,
          variantTitle: i.variantTitle || undefined,
          quantity: i.quantity,
          unitPrice: i.price,
          imageUrl: i.image || undefined,
        })),
        subtotal,
      });
    }, 2000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, email, form.firstName, form.lastName, form.phone, profile?.id]);

  // Pre-fill address from the user's default address when profile loads
  useEffect(() => {
    if (!profile) return;
    const addr = parseDefaultAddress(profile.default_address);
    setForm((prev) => ({
      ...prev,
      firstName: prev.firstName || profile.first_name || "",
      lastName: prev.lastName || profile.last_name || "",
      country: addr.country_code && COUNTRY_OPTIONS.find((o) => o.code === addr.country_code)?.enabled ? addr.country_code : prev.country,
      address: prev.address || addr.address1 || "",
      address2: prev.address2 || addr.address2 || "",
      city: prev.city || addr.city || "",
      state: prev.state || addr.province_code || "",
      postalCode: prev.postalCode || addr.zip || "",
      phone: prev.phone || addr.phone || "",
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Express shipping isn't offered for pre-orders (pre-ordered lines ship
  // separately once restocked). If the cart becomes a pre-order while Express is
  // selected, fall back to Standard so the choice stays valid.
  useEffect(() => {
    if (hasPreorderItems && shippingOption === "express") {
      setShippingOption("standard");
    }
  }, [hasPreorderItems, shippingOption]);

  // Pickup can stop being valid mid-session: the last pre-order item is removed,
  // the destination changes, or staff turn the option off. Fall back to Standard
  // rather than leaving an invalid selection the server would reject.
  useEffect(() => {
    if (shippingOption === "popup_pickup" && !pickupAvailable) {
      setShippingOption("standard");
    }
  }, [pickupAvailable, shippingOption]);

  // International orders ship on a single flat rate — the domestic Express /
  // Pickup tiers don't apply. Reset to Standard when shipping abroad.
  useEffect(() => {
    if (isInternational && shippingOption !== "standard") {
      setShippingOption("standard");
    }
  }, [isInternational, shippingOption]);

  // Re-validate free_shipping discount when the shipping tier changes
  useEffect(() => {
    if (appliedPromo?.discountType === "free_shipping") {
      validatePromo
        .mutateAsync({
          code: appliedPromo.code,
          subtotal,
          shippingCost,
          items: items.map((i) => ({
            productId: i.productId,
            price: i.price,
            quantity: i.quantity,
          })),
        })
        .then((result) => {
          setAppliedPromo((prev) =>
            prev ? { ...prev, discountAmount: result.discountAmount } : null
          );
        })
        .catch(() => null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingOption]);

  if (items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="select-none text-[64px] font-semibold leading-none tracking-tight text-fill sm:text-[96px]">
          0/1NRI
        </p>
        <p className="mt-6 text-[13px] uppercase tracking-[0.2em] text-text-secondary">
          Nothing to check out
        </p>
        <p className="mt-2 max-w-xs text-[12px] leading-relaxed tracking-[0.04em] text-text-placeholder">
          Can&apos;t check out an empty cart - that&apos;s just window shopping.
          Add something first.
        </p>
        <Link
          href="/products"
          className={`mt-8 px-8 py-3 ${outlineButton}`}
        >
          Start shopping
        </Link>
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

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setPromoError(null);
    try {
      const result = await validatePromo.mutateAsync({
        code: promoInput.trim(),
        subtotal,
        shippingCost,
        items: items.map((i) => ({
          productId: i.productId,
          price: i.price,
          quantity: i.quantity,
        })),
      });
      setAppliedPromo({
        code: promoInput.trim().toUpperCase(),
        promoCodeId: result.promoCodeId,
        discountAmount: result.discountAmount,
        discountType: result.discountType,
      });
      setPromoInput("");
    } catch (err: any) {
      setPromoError(err?.message || "Invalid promo code");
      setAppliedPromo(null);
    }
  }

  async function handleValidateAndPay(): Promise<boolean> {
    const validationErrors = validateForm(form, shippingOption === "popup_pickup");

    if (!isSignedIn) {
      if (!email.trim()) {
        setEmailError("Email address is required");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setEmailError("Please enter a valid email address");
        return false;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }

    setProcessing(true);
    try {
      const order = await createOrder.mutateAsync({
        items: items.map((i) => ({
          variantId: i.variantId,
          productId: i.productId,
          productTitle: i.productTitle,
          variantTitle: i.variantTitle || undefined,
          price: i.price,
          quantity: i.quantity,
        })),
        shippingAddress: {
          fullName: `${form.firstName} ${form.lastName}`.trim(),
          address: form.address,
          address2: form.address2 || undefined,
          city: form.city,
          state: form.state || undefined,
          region: form.country,
          postalCode: form.postalCode || undefined,
          phone: form.phone,
        },
        paymentReference: reference,
        shippingCost: shippingCost,
        shippingMethod: shippingOption,
        promoCode: appliedPromo?.code,
        guestEmail: !isSignedIn ? email.trim() : undefined,
      });

      if (order.guest_token) {
        sessionStorage.setItem("iris_guest_token", order.guest_token);
      }

      setPendingOrderNumber(order.order_number);
      setHoldExpiresAt(order.hold_expires_at ?? null);

      // Close the abandoned-checkout snapshot for this session.
      snapshotCheckout({
        email: email.trim() || undefined,
        phone: form.phone || undefined,
        customerName: `${form.firstName} ${form.lastName}`.trim() || undefined,
        userId: profile?.id || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productTitle,
          variantTitle: i.variantTitle || undefined,
          quantity: i.quantity,
          unitPrice: i.price,
          imageUrl: i.image || undefined,
        })),
        subtotal,
        completedOrderId: order.id,
      });

      if (saveAsDefault && isSignedIn) {
        try {
          await apiClient("/profile", {
            method: "PUT",
            body: {
              default_address: {
                address1: form.address,
                address2: form.address2 || null,
                city: form.city,
                province_code: form.state || null,
                zip: form.postalCode || null,
                country_code: form.country,
                phone: form.phone,
              },
            },
          });
        } catch {
          // Non-critical — don't block payment if this fails
        }
      }

      return true;
    } catch (err: any) {
      toast.error(err?.message || "Could not start your order. Please try again.", { duration: 6000 });
      setProcessing(false);
      // Start fresh on the next attempt — if the previous reservation expired
      // for good, retrying with the same payment reference would just fail again.
      setReference(generateReference());
      setHoldExpiresAt(null);
      return false;
    }
  }

  async function handlePaymentSuccess() {
    clearCart();
    // Confirm payment server-side and get the real order number back.
    // This is idempotent — safe if the webhook already ran.
    const confirmed = await confirmPaymentByReference(reference);
    const orderNum = confirmed?.order_number ?? pendingOrderNumber ?? reference;
    router.push(`/checkout/confirmation?order=${orderNum}`);
  }

  function handlePaymentClose() {
    // Customer closed the Paystack modal without paying. The pending order
    // still exists on the backend; allow them to retry without re-creating.
    setProcessing(false);
  }

  const inputClass =
    "w-full rounded-md border border-line-strong px-4 py-3 text-sm outline-none transition focus:border-invert-bg focus:ring-1 focus:ring-invert-bg bg-surface text-text";

  const pickupCard =
    pickupAvailable && popupPickup ? (
      <label
        key="popup_pickup"
        className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition ${
          isPickup
            ? "border-invert-bg bg-surface"
            : "border-line bg-surface hover:border-line-strong"
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="radio"
            name="shipping"
            value="popup_pickup"
            checked={isPickup}
            onChange={() => setShippingOption("popup_pickup")}
            className="h-4 w-4 accent-invert-bg"
          />
          <div>
            <p className="text-sm font-medium text-text">{popupPickup.label}</p>
            <p className="text-xs text-text-secondary">
              {popupPickup.nextPickupLabel}
              {popupPickup.location ? ` · ${popupPickup.location}` : ""}
            </p>
          </div>
        </div>
        <span className="text-sm font-medium text-success">Free</span>
      </label>
    ) : null;

  // Pickup only shows on pre-order carts, which is exactly when Express is
  // greyed out — so it sits above Express rather than below the dead option.
  // Falls back to the end of the list if no Express tier is configured.
  const expressIndex = shippingOptions.findIndex((o) => o.id === "express");
  const pickupIndex = expressIndex === -1 ? shippingOptions.length : expressIndex;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* ── Left Column: Form ── */}
        <div className="px-6 py-8 lg:px-12 lg:py-10">
          {/* Step 1: Customer */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-invert-bg text-xs font-semibold text-invert-fg">
                1
              </span>
              <h2 className="text-base font-semibold text-text">
                Customer
              </h2>
            </div>

            {isSignedIn ? (
              <div className="ml-10">
                <p className="text-sm text-text-secondary">{email}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-text-secondary">
                  Already have an account?{" "}
                  <Link
                    href="/login?redirect=/checkout"
                    className="underline hover:text-text"
                  >
                    Sign in for faster checkout
                  </Link>
                </p>
                <div>
                  <label className="mb-1.5 block text-xs text-text-secondary">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                  {emailError && (
                    <p className="mt-1 text-xs text-danger">{emailError}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Delivery */}
          <div className="mb-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-invert-bg text-xs font-semibold text-invert-fg">
                2
              </span>
              <h2 className="text-base font-semibold text-text">
                Delivery
              </h2>
            </div>

            <p className="mb-4 text-sm font-medium text-text-secondary">
              {shippingOption === "popup_pickup" ? "Your details" : "Shipping address"}
            </p>

            <div className="space-y-4">
              {/* Row: Country / Region */}
              <div>
                <label className="mb-1.5 block text-xs text-text-secondary">
                  Country / Region
                </label>
                <div className="relative">
                  <select
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    {COUNTRY_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code} disabled={!opt.enabled}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                </div>
              </div>

              {/* Row: First name / Last name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs text-text-secondary">
                    First name
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => handleChange("firstName", e.target.value)}
                    placeholder="First name"
                    className={inputClass}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-danger">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-text-secondary">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => handleChange("lastName", e.target.value)}
                    placeholder="Last name"
                    className={inputClass}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-danger">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Row: Address — hidden for pickup */}
              {shippingOption !== "popup_pickup" && (
                <div>
                  <label className="mb-1.5 block text-xs text-text-secondary">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Address"
                    className={inputClass}
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-danger">{errors.address}</p>
                  )}
                </div>
              )}

              {/* Row: Address line 2 — hidden for pickup */}
              {shippingOption !== "popup_pickup" && (
                <div>
                  <label className="mb-1.5 block text-xs text-text-secondary">
                    Address Line 2 <span className="text-text-muted">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.address2}
                    onChange={(e) => handleChange("address2", e.target.value)}
                    placeholder="Apt, suite, unit, etc."
                    className={inputClass}
                  />
                </div>
              )}

              {/* Row: City / Postal code — hidden for pickup */}
              {shippingOption !== "popup_pickup" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs text-text-secondary">
                      City
                    </label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      placeholder="City"
                      className={inputClass}
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-danger">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-text-secondary">
                      Postal / ZIP code
                    </label>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(e) => handleChange("postalCode", e.target.value)}
                      placeholder="Postal code"
                      className={inputClass}
                    />
                    {errors.postalCode && (
                      <p className="mt-1 text-xs text-danger">{errors.postalCode}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Row: State / Province — international destinations only */}
              {shippingOption !== "popup_pickup" && isInternational && (
                <div>
                  <label className="mb-1.5 block text-xs text-text-secondary">
                    State / Province
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => handleChange("state", e.target.value)}
                    placeholder="e.g. California"
                    className={inputClass}
                  />
                  {errors.state && (
                    <p className="mt-1 text-xs text-danger">{errors.state}</p>
                  )}
                </div>
              )}

              {/* Row: Phone */}
              <div>
                <label className="mb-1.5 block text-xs text-text-secondary">
                  Phone number
                </label>
                <PhoneInput
                  value={form.phone}
                  onChange={(e164) => handleChange("phone", e164)}
                  defaultCountry={form.country}
                  required
                  error={errors.phone}
                />
                {isSignedIn && (
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={saveAsDefault}
                      onChange={(e) => setSaveAsDefault(e.target.checked)}
                      className="h-3.5 w-3.5 accent-invert-bg"
                    />
                    Save as default address
                  </label>
                )}
              </div>
              </div>
            </div>

          {/* Step 3: Payment */}
          <div>
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-invert-bg text-xs font-semibold text-invert-fg">
                3
              </span>
              <h2 className="text-base font-semibold text-text">
                Payment
              </h2>
            </div>

            <p className="mb-4 text-sm text-text-secondary">
              You will be securely redirected to Paystack to complete your
              payment.
            </p>

            {Object.keys(errors).length > 0 && (
              <p className="mb-4 text-sm text-danger">
                Please fill in all required delivery fields above.
              </p>
            )}

            <PayNowButton
              email={email}
              amount={total}
              reference={reference}
              phone={form.phone || undefined}
              disabled={processing}
              onBeforeOpen={handleValidateAndPay}
              onSuccess={handlePaymentSuccess}
              onClose={() => {
                // Free the held stock right away instead of waiting for the hold to
                // lapse naturally. The reference is kept as-is so the next "Pay Now"
                // click is picked up by the one-time hold-refresh logic in create().
                releaseStockHold(reference);
                setHoldExpiresAt(new Date().toISOString());
                setProcessing(false);
                toast.warning("Payment was cancelled. You can try again.", { duration: 5000 });
              }}
            />
          </div>
        </div>

        {/* ── Right Column: Order Summary ── */}
        <div className="border-l border-line bg-surface-subtle px-6 py-8 lg:px-12 lg:py-10">
          <h2 className="mb-6 text-lg font-semibold text-text">
            Order Summary
          </h2>

          {hasPreorderItems && (
            <div className="mb-6 border border-line bg-surface px-4 py-3 text-xs leading-relaxed text-text-secondary">
              <p className="mb-1 font-semibold uppercase tracking-[0.12em] text-text">
                {isPickup ? "Collect at our pop-up" : "Your order includes pre-order items"}
              </p>
              {isPickup && popupPickup ? (
                <>
                  Your whole order will be ready to collect on{" "}
                  <strong>{popupPickup.nextPickupLabel}</strong>
                  {popupPickup.location ? ` at ${popupPickup.location}` : ""}. You&apos;re charged
                  today, there&apos;s no delivery fee, and nothing ships — bring your order number
                  with you on the day.
                  {popupPickup.note ? ` ${popupPickup.note}` : ""}
                </>
              ) : (
                <>
                  Items marked <strong>Pre-order</strong> aren&apos;t in stock yet. You&apos;re charged
                  today and they ship separately within 10-15 working days, the rest of your order ships as usual.
                </>
              )}
            </div>
          )}

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
                  <div className="flex h-20 w-20 items-center justify-center rounded-md bg-fill text-xs text-text-muted">
                    No image
                  </div>
                )}
                <div className="flex flex-1 items-start justify-between">
                  <div>
                    <p className="text-sm font-medium uppercase text-text">
                      {item.productTitle}
                    </p>
                    {item.variantTitle && (
                      <p className="mt-0.5 text-xs text-text-secondary">
                        {item.variantTitle}
                      </p>
                    )}
                    {isItemPreorder(item) && (
                      <span className="mt-1 inline-flex w-fit items-center border border-invert-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-text">
                        Pre-order
                      </span>
                    )}
                    {item.quantity > 1 && (
                      <p className="mt-0.5 text-xs text-text-secondary">
                        Qty: {item.quantity}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-medium text-text">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Promo Code */}
          <div className="mt-6">
            {appliedPromo ? (
              <div className="flex items-center justify-between rounded-md bg-success-surface border border-success/40 px-4 py-3 text-sm">
                <span className="text-success">
                  <strong>{appliedPromo.code}</strong> applied - {formatPrice(appliedPromo.discountAmount)} off
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoInput("");
                    setPromoError(null);
                  }}
                  className="ml-4 text-xs text-success underline hover:text-success"
                >
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => {
                      setPromoInput(e.target.value.toUpperCase());
                      setPromoError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyPromo()}
                    placeholder="Promo code"
                    className="w-full rounded-md border border-line-strong px-4 py-3 text-sm outline-none transition focus:border-invert-bg focus:ring-1 focus:ring-invert-bg bg-surface text-text"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={validatePromo.isPending || !promoInput.trim()}
                    className="shrink-0 rounded-md border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-text-secondary hover:bg-fill disabled:opacity-50"
                  >
                    {validatePromo.isPending ? "Checking…" : "Apply"}
                  </button>
                </div>
                {promoError && (
                  <p className="mt-1.5 text-xs text-danger">{promoError}</p>
                )}
              </>
            )}
          </div>

          {/* Summary breakdown */}
          <div className="mt-6 space-y-2 border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-semibold text-text">
              Summary
            </h3>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                Subtotal
              </span>
              <span className="text-text">
                {formatPrice(subtotal)}
              </span>
            </div>
            {/* <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Taxes</span>
              <span className="text-text">Included</span>
            </div> */}
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                Shipping/Delivery
              </span>
              <span className={shippingOption === "popup_pickup" ? "font-medium text-success" : "text-text"}>
                {shippingOption === "popup_pickup" ? "Free" : formatPrice(shippingCost)}
              </span>
            </div>
            {appliedPromo && (
              <div className="flex justify-between text-sm">
                <span className="text-success">
                  Discount ({appliedPromo.code})
                </span>
                <span className="text-success">
                  - {formatPrice(discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">
                Fees (1.95%)
              </span>
              <span className="text-text">
                {formatPrice(fees)}
              </span>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-sm font-semibold">
              <span className="text-text">Total</span>
              <span className="text-text">
                {formatPrice(total)}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              All prices are VAT inclusive.
            </p>
            {currency !== "GHS" && rates[currency] && (
              <p className="mt-2 text-xs text-text-muted">
                Exchange rate: 1 {currency} = {(1 / rates[currency]).toFixed(2)} GH₵ · You will be charged GH₵ {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Delivery options */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-text">
              Delivery is estimated for
            </p>
            <div className="space-y-3">
              {isInternational ? (
                // International destinations ship on a single flat per-country rate.
                <div className="flex items-center justify-between rounded-lg border border-invert-bg bg-surface p-4">
                  <div>
                    <p className="text-sm font-medium text-text">
                      {internationalRate?.label ?? "International shipping"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {internationalRate?.estimate
                        ? `Estimated delivery, ${internationalRate.estimate}`
                        : "Flat-rate international delivery"}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-text">
                    {formatPrice(shippingCost)}
                  </span>
                </div>
              ) : (
                shippingOptions.map((option, index) => {
                // Express is unavailable when the order contains pre-order items —
                // those lines ship separately once restocked, so it can't be honoured.
                const disabled = option.id === "express" && hasPreorderItems;
                return (
                <React.Fragment key={option.id}>
                {index === pickupIndex && pickupCard}
                <label
                  className={`flex items-center justify-between rounded-lg border p-4 transition ${
                    disabled
                      ? "cursor-not-allowed border-line bg-surface-subtle opacity-60"
                      : shippingOption === option.id
                      ? "cursor-pointer border-invert-bg bg-surface"
                      : "cursor-pointer border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={shippingOption === option.id}
                      disabled={disabled}
                      onChange={() => setShippingOption(option.id as "standard" | "express")}
                      className="h-4 w-4 accent-invert-bg disabled:cursor-not-allowed"
                    />
                    <div>
                      <p className="text-sm font-medium text-text">
                        {option.label}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {disabled
                          ? "Not available for pre-order items"
                          : `Estimated delivery, ${option.estimate}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-text">
                    {formatPrice(option.price)}
                  </span>
                </label>
                </React.Fragment>
                );
              })
              )}
              {!isInternational && pickupIndex === shippingOptions.length && pickupCard}
            </div>
            {holdExpiresAt && <StockHoldTimer expiresAt={holdExpiresAt} />}
          </div>
        </div>
      </div>
    </div>
  );
}
