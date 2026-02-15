"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Admin login</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to manage products, orders, and operations.
        </p>

        {unauthorizedError && (
          <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Your account does not have admin access. Please sign in with an
            admin account.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              name="email"
              placeholder="admin@store.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>

          <label className="block text-sm font-medium">
            Password
            <input
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              name="password"
              placeholder="Enter your password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </label>

          <button
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
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
