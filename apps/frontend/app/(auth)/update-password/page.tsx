"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import PasswordInput from "../components/PasswordInput";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match", { duration: 6000 });
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters", { duration: 6000 });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Sign out of the Supabase session — user should log in fresh
      await supabase.auth.signOut();

      router.push("/login?message=password-updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password. Please try again.", { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border-b border-gray-700 bg-transparent py-3 text-sm placeholder:text-gray-600 focus:border-white focus:outline-none transition-colors";

  // Loading state while we check for a session
  if (sessionReady === null) {
    return (
      <div className="w-full text-center text-xs uppercase tracking-[0.25em] text-gray-500">
        Verifying reset link…
      </div>
    );
  }

  // No active Supabase session — link expired or already used
  if (!sessionReady) {
    return (
      <div className="w-full space-y-8 text-center">
        <div className="space-y-2">
          <h2 className="text-xl font-medium uppercase tracking-[0.25em]">Link expired</h2>
          <p className="text-xs text-gray-500 tracking-wide">
            This password reset link has expired or has already been used.
          </p>
        </div>
        <Link
          href="/reset-password"
          className="block text-xs uppercase tracking-[0.25em] text-white underline underline-offset-4 font-medium"
        >
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-medium uppercase tracking-[0.25em]">Set new password</h2>
        <p className="text-xs text-gray-500 tracking-wide">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordInput
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className={inputClass}
        />
        <PasswordInput
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className={inputClass}
        />

        <button
          type="submit"
          disabled={!password || !confirmPassword || loading}
          className="w-full bg-white text-black px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] transition hover:bg-white/85 disabled:opacity-40"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>

      <div className="text-center text-xs text-gray-500 tracking-wide">
        <Link href="/login" className="text-white underline underline-offset-2 font-medium">
          Back to login
        </Link>
      </div>
    </div>
  );
}
