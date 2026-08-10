"use client";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";

export function ClientToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    function sync() {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    // No `richColors` — sonner's saturated defaults fight the neutral palette.
    // Toasts are drawn as ordinary elevated surfaces, with status carried by
    // the icon colour instead of the whole card.
    <Toaster
      position="bottom-right"
      theme={theme}
      toastOptions={{
        duration: 4500,
        classNames: {
          toast: "bg-surface text-text border border-line shadow-lg",
          title: "text-text",
          description: "text-text-secondary",
          actionButton: "bg-invert-bg text-invert-fg",
          cancelButton: "bg-fill text-text-secondary",
          error: "[&_[data-icon]]:text-danger",
          success: "[&_[data-icon]]:text-success",
          warning: "[&_[data-icon]]:text-warning",
        },
      }}
    />
  );
}
