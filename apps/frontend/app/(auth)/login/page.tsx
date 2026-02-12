"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type LoginMethod = "phone" | "email";
type LoginStep = "target" | "otp";

function LoginForm() {
  const [method, setMethod] = useState<LoginMethod>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<LoginStep>("target");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const supabase = createClient();

  const sendOTP = async () => {
    setError(null);
    setLoading(true);

    const payload =
      method === "phone" ? { phone } : { email: email.trim() };

    const { error: authError } = await supabase.auth.signInWithOtp(payload);
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setStep("otp");
  };

  const verifyOTP = async () => {
    setError(null);
    setLoading(true);

    const payload =
      method === "phone"
        ? { phone, token: otp, type: "sms" as const }
        : { email: email.trim(), token: otp, type: "email" as const };

    const { error: authError } = await supabase.auth.verifyOtp(payload);
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    router.push("/products");
  };

  const targetValue = method === "phone" ? phone : email;
  const targetPlaceholder =
    method === "phone" ? "Phone number" : "Email address";
  const targetType = method === "phone" ? "tel" : "email";

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
          Receive a one-time code to continue.
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="method"
            value="phone"
            checked={method === "phone"}
            onChange={() => setMethod("phone")}
          />
          Phone
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="method"
            value="email"
            checked={method === "email"}
            onChange={() => setMethod("email")}
          />
          Email
        </label>
      </div>

      {step === "target" ? (
        <div className="space-y-4">
          <input
            type={targetType}
            placeholder={targetPlaceholder}
            value={targetValue}
            onChange={(event) =>
              method === "phone"
                ? setPhone(event.target.value)
                : setEmail(event.target.value)
            }
            className="w-full border border-gray-300 p-2 rounded"
          />
          <button
            onClick={sendOTP}
            disabled={!targetValue || loading}
            className="w-full bg-black text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Code"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Enter OTP"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            className="w-full border border-gray-300 p-2 rounded"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setStep("target")}
              className="w-full border border-gray-300 px-4 py-2 rounded"
            >
              Back
            </button>
            <button
              onClick={verifyOTP}
              disabled={!otp || loading}
              className="w-full bg-black text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </div>
        </div>
      )}

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
