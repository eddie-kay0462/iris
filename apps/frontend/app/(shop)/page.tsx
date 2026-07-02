import type { Metadata } from "next";
import RoadToHQPage from "./RoadToHQClient";

export const metadata: Metadata = {
  title: "Road to HQ — Shop the Drop",
  description:
    "Six thousand units stand between 1NRI and a permanent home in Accra. Every piece you buy moves the needle. Shop Ghana-made contemporary streetwear now.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Road to HQ — Shop 1NRI Streetwear",
    description:
      "Six thousand units. One headquarters. Shop Ghana-made streetwear and be part of the road to Accra HQ.",
    images: [
      { url: "/homepage/7.jpg", width: 1200, height: 630, alt: "1NRI Road to HQ campaign" },
    ],
  },
};

export default function Page() {
  return <RoadToHQPage />;
}
