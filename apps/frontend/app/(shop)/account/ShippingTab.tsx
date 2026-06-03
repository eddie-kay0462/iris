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
    <div className="tab-panel-narrow">
      {/* Black header */}
      <div className="shipping-header">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          style={{ marginBottom: 8 }}
          aria-hidden="true"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <div className="shipping-header-title">Default Shipping Address</div>
        <div className="shipping-header-sub">Used at checkout unless changed</div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-section-label">Delivery Details</div>
        <div className="form-section">
          <div className="form-field">
            <label className="field-label" htmlFor="fullName">Full name</label>
            <input id="fullName" {...register("fullName")} className="field-input" />
            {errors.fullName && (
              <span style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.fullName.message}</span>
            )}
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="address">Address line 1</label>
            <input id="address" {...register("address")} className="field-input" />
            {errors.address && (
              <span style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.address.message}</span>
            )}
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="address2">Address line 2</label>
            <input
              id="address2"
              {...register("address2")}
              className="field-input"
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label className="field-label" htmlFor="city">City</label>
              <input id="city" {...register("city")} className="field-input" />
              {errors.city && (
                <span style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.city.message}</span>
              )}
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="region">Region</label>
              <input id="region" {...register("region")} className="field-input" />
              {errors.region && (
                <span style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.region.message}</span>
              )}
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field">
              <label className="field-label" htmlFor="postalCode">Postal code</label>
              <input
                id="postalCode"
                {...register("postalCode")}
                className="field-input"
                placeholder="Optional"
              />
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="phone">Phone</label>
              <input id="phone" {...register("phone")} className="field-input" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saved ? "Address saved ✓" : saving ? "Saving..." : "Save address"}
        </button>
      </form>

      <div className="shipping-note">
        We currently ship across Ghana. International shipping coming soon. Orders within
        Accra are typically delivered within 2–3 business days.
      </div>
    </div>
  );
}
