"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
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
      setError(err?.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Loading state while we check for a session
  if (sessionReady === null) {
    return (
      <div className="w-full text-center text-sm text-gray-500">
        Verifying reset link…
      </div>
    );
  }

  // No active Supabase session — link expired or already used
  if (!sessionReady) {
    return (
      <div className="w-full space-y-4 text-center">
        <h2 className="text-2xl font-semibold">Link expired</h2>
        <p className="text-sm text-gray-400">
          This password reset link has expired or has already been used.
        </p>
        <Link href="/reset-password" className="block text-white underline text-sm">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Set new password</h2>
        <p className="text-sm text-gray-500">
          Choose a strong password for your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full border border-gray-300 p-2 rounded bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-white"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full border border-gray-300 p-2 rounded bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-white"
        />

        {error && (
          <p className="text-sm text-red-400 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={!password || !confirmPassword || loading}
          className="w-full bg-white text-black px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500">
        <Link href="/login" className="text-white underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
