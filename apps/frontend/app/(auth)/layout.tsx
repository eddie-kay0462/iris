import Image from "next/image";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-black text-white">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Image
            src="/homepage_img/no-bg-1NRI.png"
            alt="1NRI"
            width={120}
            height={48}
            className="h-10 w-auto invert"
            priority
            unoptimized
          />
        </div>
        {children}
      </div>
      <p className="mt-8 text-xs text-gray-400">
        &copy; {new Date().getFullYear()} 1NRI. All rights reserved.
      </p>
    </div>
  );
}
