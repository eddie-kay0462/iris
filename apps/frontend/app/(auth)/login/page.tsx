"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type LoginMethod = "phone" | "email";
type LoginStep = "target" | "otp";

export default function LoginPage() {
  const [method, setMethod] = useState<LoginMethod>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<LoginStep>("target");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Log in</h1>
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
      </div>
    </div>
  );
}
