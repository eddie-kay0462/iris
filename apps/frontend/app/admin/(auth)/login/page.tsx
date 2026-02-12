"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Admin Login Page
 *
 * A simple email/password login form for admin users.
 * On success, redirects to the admin dashboard (or the page they were trying to access).
 *
 * Error states:
 * - "unauthorized" query param: Shows message that account doesn't have admin access
 * - Form submission errors: Shows inline error message
 */
function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check for unauthorized error from middleware redirect
  const unauthorizedError = searchParams.get("error") === "unauthorized";
  const redirectTo = searchParams.get("redirectTo") ?? "/admin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show error message from API
        setError(data.error ?? "Login failed");
        return;
      }

      // Success - redirect to admin dashboard or the page they were trying to access
      router.push(redirectTo);
      router.refresh(); // Refresh to update auth state in server components
    } catch {
      setError("Network error. Please try again.");
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

        {/* Show unauthorized message if redirected from middleware */}
        {unauthorizedError && (
          <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Your account does not have admin access. Please sign in with an
            admin account.
          </div>
        )}

        {/* Show form submission error */}
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
