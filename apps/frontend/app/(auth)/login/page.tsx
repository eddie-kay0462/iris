"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, setToken } from "@/lib/api/client";
import { toast } from "sonner";
import PasswordInput from "../components/PasswordInput";
import GoogleAuthButton from "../components/GoogleAuthButton";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get("message");

  useEffect(() => {
    if (message === "password-updated") {
      toast.success("Password updated successfully. Please log in with your new password.");
    } else if (searchParams.get("error") === "auth-callback-failed") {
      toast.error("The authentication link was invalid or has expired. Please try again.", { duration: 6000 });
    }
  }, [message, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiClient<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });

      setToken(data.access_token);
      toast.success("Signed in. Welcome back!");
      router.push("/");
    } catch (err: any) {
      const msg = err?.data?.message ?? err?.message;
      toast.error(
        typeof msg === "string" ? msg : "Invalid email or password",
        { duration: 6000 }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
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
        <PasswordInput
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

      <GoogleAuthButton />

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
