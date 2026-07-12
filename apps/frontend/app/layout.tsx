import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query/providers";
import { ClientToaster } from "@/components/ClientToaster";
import { SITE_URL } from "@/lib/seo/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "1NRI - Contemporary Streetwear Made in Accra, Ghana",
    template: "%s | 1NRI",
  },
  description:
    "1NRI Worldwide is a Ghana-based streetwear and fashion manufacturing brand. Designed in Accra, built for durability, shipped worldwide.",
  keywords: [
    "Ghana streetwear",
    "Accra fashion brand",
    "made in Ghana clothing",
    "African streetwear",
    "1NRI",
    "Ghana fashion",
    "contemporary African fashion",
  ],
  authors: [{ name: "1NRI Worldwide LTD" }],
  creator: "1NRI Worldwide LTD",
  publisher: "1NRI Worldwide LTD",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: SITE_URL,
    siteName: "1NRI",
    title: "1NRI - Contemporary Streetwear Made in Accra, Ghana",
    description:
      "1NRI Worldwide is a Ghana-based streetwear and fashion manufacturing brand. Designed in Accra, built for durability, shipped worldwide.",
    images: [
      {
        url: "/homepage/7.jpg",
        width: 1200,
        height: 630,
        alt: "1NRI Worldwide - streetwear made in Accra, Ghana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "1NRI - Contemporary Streetwear Made in Accra, Ghana",
    description:
      "Ghana-based streetwear brand. Designed in Accra, built for durability, shipped worldwide.",
    images: ["/homepage/7.jpg"],
    creator: "@1nriworldwide",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your Google Search Console verification token here once you have it:
    // google: "your-verification-token",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // One-time reset: force light default for all users
                  if (!localStorage.getItem('iris-theme-v2')) {
                    localStorage.removeItem('iris-theme');
                    localStorage.setItem('iris-theme-v2', '1');
                  }
                  var theme = localStorage.getItem('iris-theme');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="4cccf44a-5c51-4555-820d-3037fdf92928"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>{children}</QueryProvider>
        <ClientToaster />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "1NRI Worldwide LTD",
              url: SITE_URL,
              logo: `${SITE_URL}/homepage_img/no-bg-1NRI.png`,
              description:
                "Ghana-based fashion and manufacturing brand. Contemporary streetwear designed in Accra.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Accra",
                addressCountry: "GH",
              },
              sameAs: [
                "https://instagram.com/_1nriworldwide",
                "https://www.tiktok.com/@1nriworldwide",
                "https://youtube.com/@1nriworldwide",
                "https://www.linkedin.com/in/1nriworldwide/",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                email: "1nriiworldwide@gmail.com",
                contactType: "customer service",
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "1NRI Worldwide",
              url: SITE_URL,
            }),
          }}
        />
      </body>
    </html>
  );
}
