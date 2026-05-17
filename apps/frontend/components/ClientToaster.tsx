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
    <Toaster
      position="bottom-right"
      richColors
      theme={theme}
      toastOptions={{ duration: 4500 }}
    />
  );
}
