"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, setToken } from "@/lib/api/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiClient<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      setToken(data.access_token);
      router.push("/products");
    } catch (err: any) {
      setError(
        err?.data?.message || err?.data?.error || "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {registered && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800 text-center">
          Account created successfully. Please log in.
        </div>
      )}

      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Log in</h2>
        <p className="text-sm text-gray-500">
          Enter your credentials to continue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border border-gray-300 p-2 rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-gray-300 p-2 rounded"
        />
        <button
          type="submit"
          disabled={!email || !password || loading}
          className="w-full bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-600 text-center">{error}</p>
      ) : null}

      <div className="space-y-2 text-center text-sm text-gray-500">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-white underline">
            Sign up
          </Link>
        </p>
        <p>
          <Link href="/reset-password" className="text-white font-semibold underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
