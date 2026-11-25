import type { MetadataRoute } from "next";
import { CLUB } from "@/lib/club";
import { refreshClub } from "@/lib/site";

// Gør det muligt at lægge siden på telefonens hjemmeskærm som en app
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  await refreshClub();
  return {
    name: CLUB.name,
    short_name: CLUB.shortName,
    description: `Træning, kalender og fællesskab i ${CLUB.name}`,
    start_url: "/min-side",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: CLUB.colors.theme,
    lang: "da",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
