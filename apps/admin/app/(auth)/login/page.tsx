"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { apiClient, setToken } from "@/lib/api/client";

/**
 * Admin Login Page
 *
 * Email/password login for admin users.
 * On success, stores JWT and redirects to admin dashboard.
 */
function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const unauthorizedError = searchParams.get("error") === "unauthorized";
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = await apiClient<{ access_token: string }>(
        "/auth/admin/login",
        {
          method: "POST",
          body: { email, password },
        }
      );

      setToken(data.access_token);
      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      setError(
        err?.data?.message || err?.data?.error || "Login failed"
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — editorial image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        {/* Full-bleed photo */}
        <Image
          src="/login-bg.jpeg"
          alt="1NRI editorial"
          fill
          className="object-cover object-top"
          priority
        />
        {/* Gradient overlay — dark at top and bottom, transparent in middle */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/10 to-black/80" />

        {/* Top — logo */}
        <div className="absolute top-10 left-10 right-10 flex items-center gap-3">
          <span className="text-white text-3xl font-black tracking-tighter">1NRI</span>
          <span className="text-white/40 text-xs font-medium uppercase tracking-[0.2em] mt-1">WorldWide</span>
        </div>

        {/* Bottom — tagline */}
        <div className="absolute bottom-10 left-10 right-10 space-y-3">
          <div className="h-px w-10 bg-white/30" />
          <p className="text-white/90 text-lg font-light leading-snug">
            Operations Portal
          </p>
          <p className="text-white/40 text-xs tracking-wide">
            Authorised personnel only &mdash; All activity is monitored.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <span className="text-slate-900 text-2xl font-bold tracking-tight">1NRI</span>
            <span className="ml-2 text-slate-400 text-sm font-medium uppercase tracking-widest">Operations</span>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your admin account to continue.
          </p>

          {unauthorizedError && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <span className="mt-0.5 text-amber-500">&#9888;</span>
              <p className="text-sm text-amber-800">
                Your account does not have admin access. Please sign in with an admin account.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <span className="mt-0.5 text-red-400">&#10005;</span>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                name="email"
                placeholder="you@company.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                name="password"
                placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={isLoading}
            >
              {isLoading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Access restricted to authorised personnel only.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
