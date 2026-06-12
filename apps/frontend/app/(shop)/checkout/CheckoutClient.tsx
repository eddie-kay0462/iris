"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePaystackPayment } from "react-paystack";
import { useCart } from "@/lib/cart";
import { useCreateOrder, confirmPaymentByReference } from "@/lib/api/orders";
import PhoneInput from "@/components/PhoneInput";
import { useProfile, parseDefaultAddress } from "@/lib/api/profile";
import { apiClient, hasToken, getToken } from "@/lib/api/client";
import { PAYSTACK_PUBLIC_KEY } from "@/lib/paystack/client";
import { useShippingOptions, DEFAULT_SHIPPING_OPTIONS } from "@/lib/api/settings";
import { useValidatePromo, DiscountType } from "@/lib/api/promos";
import { ChevronDown } from "lucide-react";
import { useLocale } from "@/lib/locale/locale-provider";
import { track, snapshotCheckout } from "@/lib/analytics/tracker";

function generateReference() {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `IRD-${ts}-${rand}`;
}


const COUNTRY_OPTIONS = [
  { code: "GH", label: "Ghana", enabled: true },
  { code: "US", label: "United States", enabled: false },
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
  postalCode: "",
};

function validateForm(form: ShippingForm, isPickup: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required";
  if (!form.lastName.trim()) errors.lastName = "Last name is required";
  if (!form.phone) errors.phone = "Phone number is required";
  else if (!/^\+\d{7,15}$/.test(form.phone)) errors.phone = "Enter a valid phone number";
  if (!form.city.trim()) errors.city = "City is required";
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
      className="w-full rounded-md bg-gray-900 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-black disabled:bg-gray-300 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-gray-100 dark:disabled:bg-gray-700"
    >
      {disabled ? "Processing..." : "Pay Now"}
    </button>
  );
}

export default function CheckoutClient() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { currency, rates } = useLocale();
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
  const [processing, setProcessing] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [shippingOption, setShippingOption] = useState<"standard" | "express" | "pickup">("standard");
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
  const shippingCost =
    shippingOptions.find((o) => o.id === shippingOption)?.price ?? shippingOptions[0]?.price ?? 40;
  const discountAmount = appliedPromo?.discountAmount ?? 0;
  const total = Math.max(0, subtotal + shippingCost - discountAmount);

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
      postalCode: prev.postalCode || addr.zip || "",
      phone: prev.phone || addr.phone || "",
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

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
    const validationErrors = validateForm(form, shippingOption === "pickup");

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
          region: form.country,
          postalCode: form.postalCode || undefined,
          phone: form.phone,
        },
        paymentReference: reference,
        shippingCost: shippingCost,
        shippingMethod: (shippingOption === "pickup" ? "standard" : shippingOption),
        promoCode: appliedPromo?.code,
        guestEmail: !isSignedIn ? email.trim() : undefined,
      });

      if (order.guest_token) {
        sessionStorage.setItem("iris_guest_token", order.guest_token);
      }

      setPendingOrderNumber(order.order_number);

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
    "w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-white dark:focus:ring-white";

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="mx-auto grid max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* ── Left Column: Form ── */}
        <div className="px-6 py-8 lg:px-12 lg:py-10">
          {/* Step 1: Customer */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white dark:bg-white dark:text-black">
                1
              </span>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Customer
              </h2>
            </div>

            {isSignedIn ? (
              <div className="ml-10">
                <p className="text-sm text-gray-500 dark:text-gray-400">{email}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Already have an account?{" "}
                  <Link
                    href="/login?redirect=/checkout"
                    className="underline hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Sign in for faster checkout
                  </Link>
                </p>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
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
                    <p className="mt-1 text-xs text-red-500">{emailError}</p>
                  )}
                </div>
              </div>
            )}
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
              {/* Row: Country / Region */}
              <div>
                <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
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
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                </div>
              </div>

              {/* Row: First name / Last name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
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
                    <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
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
                    <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* Row: Address — hidden for pickup */}
              {shippingOption !== "pickup" && (
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
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
                    <p className="mt-1 text-xs text-red-500">{errors.address}</p>
                  )}
                </div>
              )}

              {/* Row: Address line 2 — hidden for pickup */}
              {shippingOption !== "pickup" && (
                <div>
                  <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                    Address Line 2 <span className="text-gray-400">(optional)</span>
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
              {shippingOption !== "pickup" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
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
                      <p className="mt-1 text-xs text-red-500">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
                      Postal / ZIP code
                    </label>
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={(e) => handleChange("postalCode", e.target.value)}
                      placeholder="Postal code"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* Row: Phone */}
              <div>
                <label className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
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
                  <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={saveAsDefault}
                      onChange={(e) => setSaveAsDefault(e.target.checked)}
                      className="h-3.5 w-3.5 accent-gray-900 dark:accent-white"
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

            <PayNowButton
              email={email}
              amount={total}
              reference={reference}
              phone={form.phone || undefined}
              disabled={processing}
              onBeforeOpen={handleValidateAndPay}
              onSuccess={handlePaymentSuccess}
              onClose={() => {
                setReference(generateReference());
                toast.warning("Payment was cancelled. You can try again.", { duration: 5000 });
              }}
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

          {/* Promo Code */}
          <div className="mt-6">
            {appliedPromo ? (
              <div className="flex items-center justify-between rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm dark:bg-green-950 dark:border-green-800">
                <span className="text-green-700 dark:text-green-400">
                  <strong>{appliedPromo.code}</strong> applied — GH₵{" "}
                  {appliedPromo.discountAmount.toLocaleString()} off
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAppliedPromo(null);
                    setPromoInput("");
                    setPromoError(null);
                  }}
                  className="ml-4 text-xs text-green-700 underline hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
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
                    className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    disabled={validatePromo.isPending || !promoInput.trim()}
                    className="shrink-0 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {validatePromo.isPending ? "Checking…" : "Apply"}
                  </button>
                </div>
                {promoError && (
                  <p className="mt-1.5 text-xs text-red-500">{promoError}</p>
                )}
              </>
            )}
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
            {appliedPromo && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600 dark:text-green-400">
                  Discount ({appliedPromo.code})
                </span>
                <span className="text-green-600 dark:text-green-400">
                  - GH₵ {discountAmount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-3 text-sm font-semibold dark:border-gray-700">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-gray-900 dark:text-white">
                GH₵ {total.toLocaleString()}
              </span>
            </div>
            {currency !== "GHS" && rates[currency] && (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                Exchange rate: 1 {currency} = {(1 / rates[currency]).toFixed(2)} GH₵ · You will be charged GH₵ {total.toLocaleString()}
              </p>
            )}
          </div>

          {/* Delivery options */}
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Delivery is estimated for
            </p>
            <div className="space-y-3">
              {shippingOptions.map((option) => (
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
                      onChange={() => setShippingOption(option.id as "standard" | "express" | "pickup")}
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
