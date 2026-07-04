import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About 1NRI Worldwide",
  description:
    "1NRI Worldwide is a fashion and manufacturing brand headquartered in Accra, Ghana - combining contemporary streetwear design with structured, locally-made garment production.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About 1NRI Worldwide - Built in Accra, Worn Everywhere",
    description:
      "Learn about 1NRI: a Ghana-based fashion and manufacturing brand serving style-conscious customers across Ghana, Nigeria, the UK, Canada, and the US.",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
