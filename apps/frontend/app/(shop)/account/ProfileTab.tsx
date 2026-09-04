"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/validation";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";

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

const inputCls =
  "w-full px-3 py-2.5 border border-line bg-surface text-[13px] text-text outline-none transition-colors duration-200 focus:border-invert-bg placeholder:text-text-placeholder box-border rounded-none";

const labelCls =
  "text-[11px] font-medium text-text-secondary mb-1.5 tracking-[0.02em]";

const sectionLabelCls =
  "text-[10px] font-semibold uppercase tracking-[0.16em] text-text-muted font-mono mb-3";

const sectionCls =
  "border-t border-line pt-5 flex flex-col gap-4";

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
    } catch (err) {
      toast.error(apiErrorMessage(err) ?? "Save failed.", { duration: 6000 });
    } finally {
      setSaving(false);
    }
  }

  const initials =
    (profile.first_name?.[0] ?? "") + (profile.last_name?.[0] ?? "");

  return (
    <div className="max-w-[520px] mx-auto">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="group relative w-[88px] h-[88px] rounded-full bg-invert-bg cursor-pointer flex items-center justify-center overflow-hidden"
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          aria-label="Upload profile photo"
        >
          {avatar ? (
            /* Also holds a data: URL while previewing a freshly picked file,
               which next/image cannot optimise. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-invert-fg text-2xl font-light tracking-[0.04em] uppercase select-none">
              {initials || "?"}
            </span>
          )}
          <div
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 rounded-full"
            aria-hidden="true"
          >
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
        <button
          className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.1em] text-text-muted bg-transparent border-none cursor-pointer transition-colors duration-200 hover:text-text"
          type="button"
          onClick={() => fileRef.current?.click()}
        >
          {avatar ? "Change photo" : "Add photo"}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Personal info */}
        <div className={sectionLabelCls}>Personal Information</div>
        <div className={sectionCls}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col">
              <label className={labelCls} htmlFor="first_name">First name</label>
              <input id="first_name" {...register("first_name")} className={inputCls} />
              {errors.first_name && (
                <span className="text-[11px] text-danger mt-1 block">
                  {errors.first_name.message}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <label className={labelCls} htmlFor="last_name">Last name</label>
              <input id="last_name" {...register("last_name")} className={inputCls} />
              {errors.last_name && (
                <span className="text-[11px] text-danger mt-1 block">
                  {errors.last_name.message}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <label className={labelCls} htmlFor="email">Email</label>
            <input
              id="email"
              value={profile.email ?? ""}
              readOnly
              className={`${inputCls} bg-surface-subtle text-text-placeholder cursor-default`}
            />
          </div>

          <div className="flex flex-col">
            <label className={labelCls} htmlFor="phone_number">Phone number</label>
            <input
              id="phone_number"
              {...register("phone_number")}
              className={inputCls}
              placeholder="+233 24 123 4567"
            />
            {errors.phone_number && (
              <span className="text-[11px] text-danger mt-1 block">
                {errors.phone_number.message}
              </span>
            )}
          </div>
        </div>

        {/* Notifications */}
        <div className={`${sectionLabelCls} mt-9`}>Notifications</div>
        <div className={sectionCls}>
          <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-text select-none" htmlFor="email_notifications">
            <input
              id="email_notifications"
              type="checkbox"
              className="acct-checkbox"
              {...register("email_notifications")}
            />
            Email notifications
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer text-[13px] text-text select-none" htmlFor="sms_notifications">
            <input
              id="sms_notifications"
              type="checkbox"
              className="acct-checkbox"
              {...register("sms_notifications")}
            />
            SMS notifications
          </label>
        </div>

        <button
          type="submit"
          className="mt-7 w-full h-11 bg-invert-bg text-invert-fg text-[11px] font-semibold uppercase tracking-[0.16em] cursor-pointer transition-colors duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed border-none rounded-none"
          disabled={saving}
        >
          {saved ? "Saved ✓" : saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
