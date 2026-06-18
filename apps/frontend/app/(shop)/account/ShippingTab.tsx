"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/validation";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

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
  defaultAddress: Record<string, string> | null;
  profileName: string;
}

function mapAddressToForm(raw: Record<string, unknown> | null): Partial<FormValues> {
  if (!raw) return {};
  return {
    fullName: (raw.fullName as string) ?? "",
    address: ((raw.address ?? raw.address1) as string) ?? "",
    address2: ((raw.address2 ?? raw.address_2) as string) ?? "",
    city: (raw.city as string) ?? "",
    region: ((raw.region ?? raw.province_code) as string) ?? "",
    postalCode: ((raw.postalCode ?? raw.zip) as string) ?? "",
    phone: (raw.phone as string) ?? "",
  };
}

const inputCls =
  "w-full px-3 py-2.5 border border-[#ddd] dark:border-neutral-700 bg-white dark:bg-[#111] text-[13px] text-[#111] dark:text-[#ededed] outline-none transition-colors duration-200 focus:border-[#111] dark:focus:border-white placeholder:text-[#ccc] dark:placeholder:text-neutral-600 box-border rounded-none";

const labelCls =
  "text-[11px] font-medium text-[#666] dark:text-neutral-400 mb-1.5 tracking-[0.02em]";

const sectionLabelCls =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-[#999] dark:text-neutral-500 font-mono mb-3";

const sectionCls =
  "border-t border-[#e5e5e5] dark:border-neutral-800 pt-5 flex flex-col gap-4";

export default function ShippingTab({ defaultAddress, profileName }: Props) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const mapped = mapAddressToForm(defaultAddress as any);

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
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.error || "Save failed.", { duration: 6000 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[520px] mx-auto">
      {/* Header bar */}
      <div className="bg-[#111] dark:bg-white text-white dark:text-[#0a0a0a] py-8 px-6 text-center mb-7 flex flex-col items-center">
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
        <div className="text-[11px] text-white/50 dark:text-black/50 mt-1">Used at checkout unless changed</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className={sectionLabelCls}>Delivery Details</div>
        <div className={sectionCls}>
          <div className="flex flex-col">
            <label className={labelCls} htmlFor="fullName">Full name</label>
            <input id="fullName" {...register("fullName")} className={inputCls} />
            {errors.fullName && (
              <span className="text-[11px] text-[#c00] dark:text-[#ff5f5f] mt-1 block">
                {errors.fullName.message}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <label className={labelCls} htmlFor="address">Address line 1</label>
            <input id="address" {...register("address")} className={inputCls} />
            {errors.address && (
              <span className="text-[11px] text-[#c00] dark:text-[#ff5f5f] mt-1 block">
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
                <span className="text-[11px] text-[#c00] dark:text-[#ff5f5f] mt-1 block">
                  {errors.city.message}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <label className={labelCls} htmlFor="region">Region</label>
              <input id="region" {...register("region")} className={inputCls} />
              {errors.region && (
                <span className="text-[11px] text-[#c00] dark:text-[#ff5f5f] mt-1 block">
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
          className="mt-7 w-full h-11 bg-[#111] dark:bg-white text-white dark:text-[#0a0a0a] text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-colors duration-200 hover:bg-[#333] dark:hover:bg-neutral-200 disabled:bg-[#555] dark:disabled:bg-neutral-700 disabled:cursor-not-allowed border-none rounded-none"
          disabled={saving}
        >
          {saved ? "Address saved ✓" : saving ? "Saving..." : "Save address"}
        </button>
      </form>

      <div className="mt-6 pl-4 border-l-2 border-[#ddd] dark:border-neutral-700 text-[12px] text-[#999] dark:text-neutral-500 leading-[1.6]">
        We currently ship across Ghana. International shipping coming soon. Orders within
        Accra are typically delivered within 2–3 business days.
      </div>
    </div>
  );
}
