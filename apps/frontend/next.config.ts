import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL must be set to configure Supabase auth rewrites.",
  );
}

let supabaseAuthDestination: string;

try {
  supabaseAuthDestination = new URL("/auth/v1/:path*", supabaseUrl).toString();
} catch {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL must be a valid URL to configure Supabase auth rewrites.",
  );
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/auth/v1/:path*",
        destination: supabaseAuthDestination,
      },
    ];
  },
};

export default nextConfig;
