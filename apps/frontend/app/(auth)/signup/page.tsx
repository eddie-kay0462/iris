"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@/lib/validation";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";

const signupSchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone_number: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignupValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupValues) => {
    setLoading(true);

    try {
      await apiClient("/auth/signup", {
        method: "POST",
        body: {
          email: data.email,
          password: data.password,
          first_name: data.first_name || undefined,
          last_name: data.last_name || undefined,
          phone_number: data.phone_number || undefined,
        },
      });

      router.push(`/verify?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.error || "Something went wrong", { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-gray-300 p-2 rounded focus:outline-none focus:ring-1 focus:ring-black";

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">Create an account</h2>
        <p className="text-sm text-gray-500">
          Fill in your details to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              {...register("first_name")}
              placeholder="First name"
              className={inputClass}
            />
          </div>
          <div>
            <input
              {...register("last_name")}
              placeholder="Last name"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <input
            {...register("email")}
            type="email"
            placeholder="Email address"
            className={inputClass}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <input
            {...register("phone_number")}
            type="tel"
            placeholder="Phone number (optional)"
            className={inputClass}
          />
        </div>

        <div>
          <input
            {...register("password")}
            type="password"
            placeholder="Password"
            className={inputClass}
          />
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <input
            {...register("confirmPassword")}
            type="password"
            placeholder="Confirm password"
            className={inputClass}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500">
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-white underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
