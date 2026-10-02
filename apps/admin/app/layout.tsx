import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/providers";
import {
  THEME_BOOT_SCRIPT,
  THEME_COOKIE,
  UI_COOKIE,
  parseUiMode,
  parseUiTheme,
} from "@/lib/ui/mode";
import { UiModeProvider } from "@/lib/ui/UiModeContext";
import { ThemedToaster } from "./components/ThemedToaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Iris Admin",
  description: "Iris admin dashboard",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const ui = parseUiMode(cookieStore.get(UI_COOKIE)?.value);
  const theme = parseUiTheme(cookieStore.get(THEME_COOKIE)?.value);
  // "system" renders light here; THEME_BOOT_SCRIPT corrects it before paint.
  const resolved = theme === "system" ? "light" : theme;
  // Dark mode is a new-IRIS feature; classic always renders light.
  const scheme = ui === "new" ? resolved : "light";

  return (
    // suppressHydrationWarning: the boot script may change data-theme and
    // color-scheme on <html> before React hydrates. It covers only this
    // element's own attributes, not the tree below.
    <html
      lang="en"
      data-ui={ui}
      data-theme={resolved}
      data-theme-pref={theme}
      style={{ colorScheme: scheme }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
      >
        <UiModeProvider initialUi={ui} initialTheme={theme}>
          <QueryProvider>{children}</QueryProvider>
          <ThemedToaster />
        </UiModeProvider>
      </body>
    </html>
  );
}
