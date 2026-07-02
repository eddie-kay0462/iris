"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePaystackPayment } from "react-paystack";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PAYSTACK_PUBLIC_KEY } from "@/lib/paystack/client";
import { createPreorder, checkPreorderEligibility } from "@/lib/api/preorders";
import { getToken } from "@/lib/api/client";

interface PreorderModalProps {
  productTitle: string;
  variantTitle: string | null;
  variantId: string;
  price: number;
  preorderLimit: number | null;
  onClose: () => void;
}

export default function PreorderModal({
  productTitle,
  variantTitle,
  variantId,
  price,
  preorderLimit,
  onClose,
}: PreorderModalProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "checking" | "paying" | "saving">("idle");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setEmail(payload.email || "");
    } catch { /* ignore */ }
  }, []);

  const total = price * quantity;

  const initializePayment = usePaystackPayment({
    email,
    amount: Math.round(total * 100),
    currency: "GHS",
    reference: `PRE-${Date.now()}`,
    publicKey: PAYSTACK_PUBLIC_KEY,
  });

  async function handlePay() {
    const token = getToken();
    if (!token) { router.push("/login"); return; }
    if (!email) {
      toast.error("Could not read your account email. Please log in again.");
      return;
    }
    setStatus("checking");
    try {
      await checkPreorderEligibility({ variantId, quantity, price });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "This pre-order is no longer available.", { duration: 6000 });
      setStatus("idle");
      return;
    }
    setStatus("paying");
    initializePayment({
      onSuccess: async (response: { reference: string }) => {
        setStatus("saving");
        try {
          const preorder = await createPreorder({
            item: { variantId, productTitle, variantTitle: variantTitle ?? undefined, quantity, price },
            paymentReference: response.reference,
          });
          router.push(`/preorders/confirmation?order=${encodeURIComponent(preorder.order_number)}`);
        } catch {
          toast.error(
            "Payment received but we couldn't record your pre-order. Please contact support with your reference: " + response.reference,
            { duration: 10000 },
          );
          setStatus("idle");
        }
      },
      onClose: () => setStatus("idle"),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="relative w-full max-w-md bg-white dark:bg-[#111] p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 text-[13px] tracking-[0.18em] uppercase font-bold text-black dark:text-white">Pre-order</h2>

        <div className="mb-4 bg-[#f4f3f1] dark:bg-[#1a1a1a] p-3">
          <p className="font-medium text-black dark:text-white">{productTitle}</p>
          {variantTitle && <p className="mt-0.5 text-sm text-[#59626E] dark:text-neutral-400">{variantTitle}</p>}
          <p className="mt-1 text-sm text-[#3B414A] dark:text-neutral-300">GH₵{price.toLocaleString()} each</p>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm tracking-widest uppercase text-[#59626E] dark:text-neutral-400">Quantity</span>
          <div className="flex items-center border border-black dark:border-white">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-1.5 text-gray-600 dark:text-neutral-300 hover:bg-[#f4f3f1] dark:hover:bg-neutral-800 transition-colors"
            >−</button>
            <span className="min-w-[2rem] text-center text-sm font-medium">{quantity}</span>
            <button
              onClick={() =>
                setQuantity((q) =>
                  preorderLimit != null ? Math.min(preorderLimit, q + 1) : q + 1,
                )
              }
              disabled={preorderLimit != null && quantity >= preorderLimit}
              className="px-3 py-1.5 text-gray-600 dark:text-neutral-300 hover:bg-[#f4f3f1] dark:hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >+</button>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between border-t border-black/10 dark:border-white/10 pt-4">
          <span className="text-[11px] tracking-widest uppercase text-[#59626E] dark:text-neutral-400">Total</span>
          <span className="text-base font-bold text-black dark:text-white">GH₵{total.toLocaleString()}</span>
        </div>

        <button
          onClick={handlePay}
          disabled={status !== "idle"}
          className="w-full bg-black dark:bg-white py-3 text-[13px] tracking-[0.18em] uppercase font-bold text-white dark:text-black disabled:opacity-60"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {status === "checking"
            ? "Checking availability…"
            : status === "paying"
              ? "Opening payment…"
              : status === "saving"
                ? "Saving pre-order…"
                : `Pay GH₵${total.toLocaleString()}`}
        </button>

        <p className="mt-3 text-center text-xs text-[#768293] dark:text-neutral-500">
          Processed securely via Paystack. Your item is reserved once stock arrives.
        </p>
      </div>
    </div>
  );
}
