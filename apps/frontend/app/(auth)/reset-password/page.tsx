"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      // Build redirectTo from the current origin so the URL is always correct
      // regardless of which environment (local, staging, production) is running.
      const redirectTo = `${window.location.origin}/api/auth/callback?next=/update-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) throw resetError;

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.", { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border-b border-gray-700 bg-transparent py-3 text-sm placeholder:text-gray-600 focus:border-white focus:outline-none transition-colors";

  return (
    <div className="w-full space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-medium uppercase tracking-[0.25em]">Reset password</h2>
        <p className="text-xs text-gray-500 tracking-wide">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {submitted ? (
        <div className="border border-gray-700 p-5 text-center text-xs leading-relaxed text-gray-400 tracking-wide">
          If an account exists for that email, a password reset link has been
          sent. Please check your inbox.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />

          <button
            type="submit"
            disabled={!email || loading}
            className="w-full bg-white text-black px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.25em] transition hover:bg-white/85 disabled:opacity-40"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      )}

      <div className="text-center text-xs text-gray-500 tracking-wide">
        <Link href="/login" className="text-white underline underline-offset-2 font-medium">
          Back to login
        </Link>
      </div>
    </div>
  );
}
