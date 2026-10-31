import type { MetadataRoute } from "next";
import { brand } from "@/config/brand";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: brand.name,
    short_name: brand.name,
    description: brand.tagline,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#121311",
    theme_color: "#121311",
    lang: "en-ZA",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
