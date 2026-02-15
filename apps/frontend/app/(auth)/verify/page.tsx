"use client";

import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient, setToken } from "@/lib/api/client";

const CODE_LENGTH = 8;
const EMPTY_CODE = Array(CODE_LENGTH).fill("");

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState<string[]>(EMPTY_CODE);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const submitCode = useCallback(
    async (digits: string[]) => {
      const token = digits.join("");
      if (token.length !== CODE_LENGTH) return;

      setError(null);
      setLoading(true);

      try {
        const data = await apiClient<{ access_token: string }>(
          "/auth/verify-otp",
          {
            method: "POST",
            body: { email, token },
          }
        );

        setToken(data.access_token);
        router.push("/products");
      } catch (err: any) {
        const msg = err?.data?.message ?? err?.message;
        setError(typeof msg === "string" ? msg : "Invalid verification code");
        setCode([...EMPTY_CODE]);
        inputRefs.current[0]?.focus();
      } finally {
        setLoading(false);
      }
    },
    [email, router]
  );

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...code];
    next[index] = digit;
    setCode(next);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === CODE_LENGTH - 1) {
      submitCode(next);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;

    const next = [...EMPTY_CODE];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setCode(next);

    if (pasted.length === CODE_LENGTH) {
      submitCode(next);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await apiClient("/auth/resend-otp", {
        method: "POST",
        body: { email },
      });
      setResendCooldown(60);
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(code);
  };

  if (!email) {
    return (
      <div className="w-full space-y-6 text-center">
        <p className="text-sm text-gray-500">
          No email address provided.{" "}
          <Link href="/signup" className="text-white underline">
            Sign up
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Verify your email</h2>
        <p className="text-sm text-gray-500">
          We sent a verification code to{" "}
          <span className="text-white font-medium">{email}</span>
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={loading}
              className="w-10 h-14 text-center text-xl font-semibold border border-gray-300 rounded bg-transparent text-white focus:outline-none focus:ring-1 focus:ring-white disabled:opacity-50"
              autoFocus={i === 0}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || code.join("").length !== CODE_LENGTH}
          className="w-full bg-black text-white px-4 py-2 rounded border border-gray-300 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500">
        <p>
          Didn&apos;t receive the code?{" "}
          {resendCooldown > 0 ? (
            <span className="text-gray-400">
              Resend in {resendCooldown}s
            </span>
          ) : (
            <button
              onClick={handleResend}
              className="text-white underline hover:opacity-80"
            >
              Resend code
            </button>
          )}
        </p>
        <p className="mt-2">
          <Link href="/signup" className="text-white underline">
            Use a different email
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
