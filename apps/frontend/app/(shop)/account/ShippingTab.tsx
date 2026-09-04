"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/validation";
import { apiClient } from "@/lib/api/client";
import type { DefaultAddress } from "@/lib/api/profile";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";

const schema = z.object({
  fullName: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  address2: z.string().optional(),
  city: z.string().min(1, "Required"),
  region: z.string().min(1, "Required"),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  defaultAddress: StoredAddress | null;
  profileName: string;
}

/**
 * A stored address is either the current `DefaultAddress` shape or the older
 * camelCase one still sitting on long-standing accounts, so both sets of keys
 * are read.
 */
type StoredAddress = DefaultAddress & {
  fullName?: string;
  address?: string;
  address_2?: string;
  region?: string;
  postalCode?: string;
};

function mapAddressToForm(raw: StoredAddress | null): Partial<FormValues> {
  if (!raw) return {};
  return {
    fullName: raw.fullName ?? "",
    address: raw.address ?? raw.address1 ?? "",
    address2: raw.address2 ?? raw.address_2 ?? "",
    city: raw.city ?? "",
    region: raw.region ?? raw.province_code ?? "",
    postalCode: raw.postalCode ?? raw.zip ?? "",
    phone: raw.phone ?? "",
  };
}

const inputCls =
  "w-full px-3 py-2.5 border border-line bg-surface text-[13px] text-text outline-none transition-colors duration-200 focus:border-invert-bg placeholder:text-text-placeholder box-border rounded-none";

const labelCls =
  "text-[11px] font-medium text-text-secondary mb-1.5 tracking-[0.02em]";

const sectionLabelCls =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted font-mono mb-3";

const sectionCls =
  "border-t border-line pt-5 flex flex-col gap-4";

export default function ShippingTab({ defaultAddress, profileName }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mapped = mapAddressToForm(defaultAddress);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: mapped.fullName || profileName,
      address: mapped.address ?? "",
      address2: mapped.address2 ?? "",
      city: mapped.city ?? "",
      region: mapped.region ?? "",
      postalCode: mapped.postalCode ?? "",
      phone: mapped.phone ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      await apiClient("/profile", {
        method: "PUT",
        body: { default_address: data },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Save failed.", { duration: 6000 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[520px] mx-auto">
      {/* Header bar */}
      <div className="bg-invert-bg text-invert-fg py-8 px-6 text-center mb-7 flex flex-col items-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="mb-2"
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <div className="text-[16px] font-semibold tracking-[0.06em]">Default Shipping Address</div>
        <div className="text-[11px] text-invert-fg/50 mt-1">Used at checkout unless changed</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={sectionLabelCls}>Delivery Details</div>
        <div className={sectionCls}>
          <div className="flex flex-col">
            <label className={labelCls} htmlFor="fullName">Full name</label>
            <input id="fullName" {...register("fullName")} className={inputCls} />
            {errors.fullName && (
              <span className="text-[11px] text-danger mt-1 block">
                {errors.fullName.message}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label className={labelCls} htmlFor="address">Address line 1</label>
            <input id="address" {...register("address")} className={inputCls} />
            {errors.address && (
              <span className="text-[11px] text-danger mt-1 block">
                {errors.address.message}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label className={labelCls} htmlFor="address2">Address line 2</label>
            <input
              id="address2"
              {...register("address2")}
              className={inputCls}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className={labelCls} htmlFor="city">City</label>
              <input id="city" {...register("city")} className={inputCls} />
              {errors.city && (
                <span className="text-[11px] text-danger mt-1 block">
                  {errors.city.message}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <label className={labelCls} htmlFor="region">Region</label>
              <input id="region" {...register("region")} className={inputCls} />
              {errors.region && (
                <span className="text-[11px] text-danger mt-1 block">
                  {errors.region.message}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className={labelCls} htmlFor="postalCode">Postal code</label>
              <input
                id="postalCode"
                {...register("postalCode")}
                className={inputCls}
                placeholder="Optional"
              />
            </div>
            <div className="flex flex-col">
              <label className={labelCls} htmlFor="phone">Phone</label>
              <input id="phone" {...register("phone")} className={inputCls} />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="mt-7 w-full h-11 bg-invert-bg text-invert-fg text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-colors duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed border-none rounded-none"
          disabled={saving}
        >
          {saved ? "Address saved ✓" : saving ? "Saving..." : "Save address"}
        </button>
      </form>

      <div className="mt-6 pl-4 border-l-2 border-line text-[12px] text-text-muted leading-[1.6]">
        We currently ship across Ghana. International shipping coming soon. Orders within
        Accra are typically delivered within 2–3 business days.
      </div>
    </div>
  );
}
