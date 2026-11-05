"use client";

import { Toaster } from "sonner";
import { useUiMode } from "@/lib/ui/UiModeContext";

export function ThemedToaster() {
  const { resolvedTheme } = useUiMode();
  return (
    <Toaster
      position="bottom-right"
      richColors
      theme={resolvedTheme}
      toastOptions={{ duration: 4500 }}
    />
  );
}
