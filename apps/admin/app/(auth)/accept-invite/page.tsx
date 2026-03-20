"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Step = "loading" | "set-password" | "success" | "error";

export default function AcceptInvitePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Supabase puts the session tokens in the URL hash after redirect
    // The @supabase/ssr browser client auto-exchanges these on init
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStep("set-password");
      } else {
        setStep("error");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    // Sign out the Supabase session — they'll log in via the normal admin login
    await supabase.auth.signOut();
    setStep("success");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <Image
          src="/login-bg.jpeg"
          alt="1NRI editorial"
          fill
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/80" />
        <div className="absolute top-10 left-10 right-10 flex items-center gap-3">
          <span className="text-white text-3xl font-black tracking-tighter">1NRI</span>
          <span className="text-white/40 text-xs font-medium uppercase tracking-[0.2em] mt-1">WorldWide</span>
        </div>
        <div className="absolute bottom-10 left-10 right-10 space-y-3">
          <div className="h-px w-10 bg-white/30" />
          <p className="text-white/90 text-lg font-light leading-snug">Welcome to the team.</p>
          <p className="text-white/40 text-xs tracking-wide">Set your password to get started.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <span className="text-slate-900 text-2xl font-bold tracking-tight">1NRI</span>
            <span className="ml-2 text-slate-400 text-sm font-medium uppercase tracking-widest">Operations</span>
          </div>

          {step === "loading" && (
            <div className="space-y-3 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
              <p className="text-sm text-slate-500">Verifying your invite...</p>
            </div>
          )}

          {step === "set-password" && (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">Set your password</h1>
              <p className="mt-2 text-sm text-slate-500">
                Choose a strong password to secure your admin account.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">New password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {isSubmitting ? "Saving..." : "Set password"}
                </button>
              </form>
            </>
          )}

          {step === "success" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <span className="text-emerald-500 text-2xl">&#10003;</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-slate-900">Password set!</h1>
                <p className="text-sm text-slate-500">
                  Your account is ready. Sign in with your email and new password.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Go to sign in
              </button>
            </div>
          )}

          {step === "error" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <span className="text-red-400 text-2xl">&#10005;</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-slate-900">Invalid or expired link</h1>
                <p className="text-sm text-slate-500">
                  This invite link has expired or already been used. Ask your admin to send a new invite.
                </p>
              </div>
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
