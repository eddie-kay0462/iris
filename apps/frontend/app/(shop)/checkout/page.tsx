"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePaystackPayment } from "react-paystack";
import { useCart } from "@/lib/cart";
import { useCreateOrder } from "@/lib/api/orders";
import { hasToken, getToken } from "@/lib/api/client";
import { PAYSTACK_PUBLIC_KEY } from "@/lib/paystack/client";

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
  address2: string;
  city: string;
  region: string;
  postalCode: string;
  phone: string;
}

const EMPTY_FORM: ShippingForm = {
  fullName: "",
  address: "",
  address2: "",
  city: "",
  region: "",
  postalCode: "",
  phone: "",
};

function validateForm(form: ShippingForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.fullName.trim()) errors.fullName = "Full name is required";
  if (!form.address.trim()) errors.address = "Address is required";
  if (!form.city.trim()) errors.city = "City is required";
  if (!form.region.trim()) errors.region = "Region is required";
  if (!form.phone.trim()) errors.phone = "Phone number is required";
  return errors;
}

function PaymentButton({
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
  onBeforeOpen: () => boolean;
  disabled: boolean;
}) {
  const config = {
    email,
    amount: Math.round(amount * 100), // pesewas
    currency: "GHS",
    reference,
    publicKey: PAYSTACK_PUBLIC_KEY,
  };

  const initializePayment = usePaystackPayment(config);

  return (
    <button
      type="button"
      onClick={() => {
        if (!onBeforeOpen()) return;
        initializePayment({ onSuccess, onClose });
      }}
      disabled={disabled}
      className="w-full rounded-lg bg-black py-3 text-sm font-semibold text-white disabled:bg-gray-300 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:disabled:bg-gray-700"
    >
      {disabled ? "Processing..." : `Pay GH₵${amount.toLocaleString()}`}
    </button>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const createOrder = useCreateOrder();
  const [form, setForm] = useState<ShippingForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!hasToken()) {
      router.push(`/login?redirect=/checkout`);
      return;
    }
    const token = getToken();
    if (token) {
      const decoded = decodeTokenEmail(token);
      if (decoded) setEmail(decoded);
    }
    setReference(generateReference());
    setAuthChecked(true);
  }, [router]);

  if (!authChecked) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500 dark:text-gray-400">
        Checking authentication...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
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

  function handleValidateAndPay() {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }
    return true;
  }

  async function handlePaymentSuccess() {
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
          fullName: form.fullName,
          address: form.address,
          address2: form.address2 || undefined,
          city: form.city,
          region: form.region,
          postalCode: form.postalCode || undefined,
          phone: form.phone,
        },
        paymentReference: reference,
      });

      clearCart();
      router.push(
        `/checkout/confirmation?order=${order.order_number}`,
      );
    } catch (err: any) {
      alert(err?.message || "Failed to create order. Please contact support.");
      setProcessing(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-gray-500";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold text-gray-900 dark:text-white">
        Checkout
      </h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Shipping form - left side */}
        <div className="lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Shipping Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => handleChange("fullName", e.target.value)}
                className={inputClass}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleChange("address", e.target.value)}
                className={inputClass}
              />
              {errors.address && (
                <p className="mt-1 text-xs text-red-500">{errors.address}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address Line 2 (optional)
              </label>
              <input
                type="text"
                value={form.address2}
                onChange={(e) => handleChange("address2", e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  City
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className={inputClass}
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-red-500">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Region
                </label>
                <input
                  type="text"
                  value={form.region}
                  onChange={(e) => handleChange("region", e.target.value)}
                  className={inputClass}
                />
                {errors.region && (
                  <p className="mt-1 text-xs text-red-500">{errors.region}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Postal Code (optional)
                </label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className={inputClass}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order summary - right side */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-800">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Order Summary
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex-1">
                    <span className="text-gray-900 dark:text-white">
                      {item.productTitle}
                    </span>
                    {item.variantTitle && (
                      <span className="text-gray-500 dark:text-gray-400">
                        {" "}
                        ({item.variantTitle})
                      </span>
                    )}
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}
                      x {item.quantity}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    GH₵{(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex items-center justify-between font-semibold text-gray-900 dark:text-white">
                <span>Total</span>
                <span>GH₵{subtotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-6">
              <PaymentButton
                email={email}
                amount={subtotal}
                reference={reference}
                disabled={processing}
                onBeforeOpen={handleValidateAndPay}
                onSuccess={handlePaymentSuccess}
                onClose={() => {}}
              />
            </div>

            {Object.keys(errors).length > 0 && (
              <p className="mt-3 text-center text-sm text-red-500">
                Please fill in all required shipping fields.
              </p>
            )}

            {createOrder.isError && (
              <p className="mt-3 text-center text-sm text-red-500">
                {(createOrder.error as any)?.message || "Order creation failed"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
