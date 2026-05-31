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
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "krnnifoypyilajatsmva.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/auth/v1/:path*",
        destination: supabaseAuthDestination,
      },
      {
        source: "/storage/v1/:path*",
        destination: new URL("/storage/v1/:path*", supabaseUrl).toString(),
      },
    ];
  },
};

export default nextConfig;
