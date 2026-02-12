import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Iris</h1>
        </div>
        {children}
      </div>
      <p className="mt-8 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} Iris. All rights reserved.
      </p>
    </div>
  );
}
