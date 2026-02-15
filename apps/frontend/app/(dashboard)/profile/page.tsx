"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/validation";
import { apiClient } from "@/lib/api/client";

const profileSchema = z.object({
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  phone_number: z.string().optional(),
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await apiClient("/profile");
        reset({
          first_name: data.first_name ?? "",
          last_name: data.last_name ?? "",
          phone_number: data.phone_number ?? "",
          email_notifications: data.email_notifications ?? false,
          sms_notifications: data.sms_notifications ?? false,
        });
      } catch {
        setMessage({ type: "error", text: "Failed to load profile." });
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [reset]);

  const onSubmit = async (data: ProfileValues) => {
    setMessage(null);
    setSaving(true);

    try {
      await apiClient("/profile", {
        method: "PUT",
        body: data,
      });

      setMessage({ type: "success", text: "Profile updated." });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err?.data?.message || err?.data?.error || "Save failed.",
      });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-black";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-gray-500">
          Update your personal information and notification preferences.
        </p>
      </div>

      {message && (
        <div
          className={`rounded border p-3 text-sm text-center ${
            message.type === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              First name
            </label>
            <input {...register("first_name")} className={inputClass} />
            {errors.first_name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.first_name.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input {...register("last_name")} className={inputClass} />
            {errors.last_name && (
              <p className="mt-1 text-xs text-red-600">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Phone number
          </label>
          <input
            {...register("phone_number")}
            type="tel"
            className={inputClass}
          />
        </div>

        <fieldset className="space-y-3 rounded border border-gray-200 p-4">
          <legend className="px-1 text-sm font-medium text-gray-700">
            Notifications
          </legend>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("email_notifications")} />
            Email notifications
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("sms_notifications")} />
            SMS notifications
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
