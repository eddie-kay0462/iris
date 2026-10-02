"use client";

import { Toaster } from "sonner";
import { useUiMode } from "@/lib/ui/UiModeContext";

export function ThemedToaster() {
  const { ui, resolvedTheme } = useUiMode();
  return (
    <Toaster
      position="bottom-right"
      richColors
      theme={ui === "new" ? resolvedTheme : "light"}
      toastOptions={{ duration: 4500 }}
    />
  );
}
