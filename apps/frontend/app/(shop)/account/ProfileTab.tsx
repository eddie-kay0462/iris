"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/validation";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

const schema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z
    .string()
    .optional()
    .refine((v) => !v || /^\+\d{7,15}$/.test(v), { message: "Enter a valid phone number" }),
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone_number: string | null;
    email_notifications?: boolean;
    sms_notifications?: boolean;
    avatar_url?: string | null;
  };
}

export default function ProfileTab({ profile }: Props) {
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      phone_number: profile.phone_number ?? "",
      email_notifications: profile.email_notifications ?? true,
      sms_notifications: profile.sms_notifications ?? false,
    },
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { ...data };
      if (avatarFile) {
        // Upload avatar to profile — encode as base64 or handle server-side
        // For now, send it as a multipart form if the backend supports it,
        // otherwise skip and only save profile fields.
      }
      await apiClient("/profile", { method: "PUT", body: payload });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.error || "Save failed.", { duration: 6000 });
    } finally {
      setSaving(false);
    }
  }

  const initials =
    (profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "");

  return (
    <div className="tab-panel-narrow">
      {/* Avatar */}
      <div className="avatar-section">
        <div
          className="avatar-ring"
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          aria-label="Upload profile photo"
        >
          {avatar ? (
            <img src={avatar} alt="Avatar" className="avatar-img" />
          ) : (
            <span className="avatar-initials">{initials || "?"}</span>
          )}
          <div className="avatar-hover" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: "none" }}
          aria-label="Upload profile photo"
        />
        <button className="avatar-btn" type="button" onClick={() => fileRef.current?.click()}>
          {avatar ? "Change photo" : "Add photo"}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Personal info */}
        <div className="form-section-label">Personal Information</div>
        <div className="form-section">
          <div className="form-row-2">
            <div className="form-field">
              <label className="field-label" htmlFor="first_name">First name</label>
              <input
                id="first_name"
                {...register("first_name")}
                className="field-input"
              />
              {errors.first_name && (
                <span style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.first_name.message}</span>
              )}
            </div>
            <div className="form-field">
              <label className="field-label" htmlFor="last_name">Last name</label>
              <input
                id="last_name"
                {...register("last_name")}
                className="field-input"
              />
              {errors.last_name && (
                <span style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.last_name.message}</span>
              )}
            </div>
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              value={profile.email ?? ""}
              readOnly
              className="field-input field-readonly"
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="phone_number">Phone number</label>
            <input
              id="phone_number"
              {...register("phone_number")}
              className="field-input"
              placeholder="+233 24 123 4567"
            />
            {errors.phone_number && (
              <span style={{ fontSize: 11, color: "#c00", marginTop: 4 }}>{errors.phone_number.message}</span>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className="form-section-label" style={{ marginTop: 36 }}>Notifications</div>
        <div className="form-section">
          <label className="check-row" htmlFor="email_notifications">
            <input
              id="email_notifications"
              type="checkbox"
              {...register("email_notifications")}
            />
            Email notifications
          </label>
          <label className="check-row" htmlFor="sms_notifications">
            <input
              id="sms_notifications"
              type="checkbox"
              {...register("sms_notifications")}
            />
            SMS notifications
          </label>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={saving}
        >
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
