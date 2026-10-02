"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiClient, setToken } from "@/lib/api/client";
import { toast } from "sonner";
import { PROMPT_COOKIE, useIsNewUi, writeCookie } from "@/lib/ui/UiModeContext";

/**
 * Admin Login Page
 *
 * Email/password login for admin users.
 * On success, stores JWT and redirects to admin dashboard.
 */
function AdminLoginForm() {
  const router = useRouter();
  const isNew = useIsNewUi();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const unauthorizedError = searchParams.get("error") === "unauthorized";
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  useEffect(() => {
    if (unauthorizedError) {
      toast.warning("Your account does not have admin access. Please sign in with an admin account.", { duration: 8000 });
    }
  }, [unauthorizedError]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      // Ask "classic or new IRIS?" once this session is in.
      writeCookie(PROMPT_COOKIE, "1", null);
      toast.success("Signed in.");
      router.push(redirectTo);
      router.refresh();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.error || "Login failed", { duration: 6000 });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={`flex min-h-screen ${isNew ? "bg-[var(--iris-bg)] lg:p-4" : ""}`}>
      {/* Left panel — editorial image */}
      <div
        className={`hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative ${
          isNew ? "overflow-hidden rounded-3xl" : ""
        }`}
        style={{
          backgroundImage: isNew ? "url('/login-bg-iris.jpg')" : "url('/login-bg.jpeg')",
          backgroundSize: "cover",
          // The new IRIS photo is a full-length portrait; keep the face in frame.
          backgroundPosition: isNew ? "center 20%" : "center top",
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/30 to-black/85" />

        {/* Top — logo */}
        <div className="relative flex items-center gap-3">
          {isNew ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/1nri-wordmark-white.png" alt="1NRI" className="h-7 w-auto" />
          ) : (
            <span className="text-white text-3xl font-black tracking-tighter">1NRI</span>
          )}
          <span className="text-white/40 text-xs font-medium uppercase tracking-[0.2em] mt-1">WorldWide LTD.</span>
        </div>

        {/* Bottom — tagline */}
        <div className="relative space-y-3">
          <div className="h-px w-10 bg-white/30" />
          <p className="text-white/90 text-lg font-light leading-snug">
            Operations Portal
          </p>
          <p className="text-white/40 text-xs tracking-wide">
            Authorised personnel only, All activity is monitored.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className={`flex w-full lg:w-1/2 flex-col items-center justify-center px-8 py-12 ${
          isNew ? "bg-[var(--iris-bg)]" : "bg-white"
        }`}
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className={`mb-10 lg:hidden ${isNew ? "flex items-center" : ""}`}>
            {isNew ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/1nri-wordmark-black.png" alt="1NRI" className="h-6 w-auto dark:hidden" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/1nri-wordmark-white.png" alt="1NRI" className="hidden h-6 w-auto dark:block" />
              </>
            ) : (
              <span className="text-slate-900 text-2xl font-bold tracking-tight">1NRI</span>
            )}
            <span className="ml-2 text-slate-400 text-sm font-medium uppercase tracking-widest">Operations</span>
          </div>

          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to your admin account to continue.
          </p>

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
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 pr-11 text-sm text-slate-900 placeholder-slate-400 transition focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                  name="password"
                  placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              className={`flex w-full items-center justify-center gap-2 ${isNew ? "rounded-full" : "rounded-lg"} bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50`}
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
