import type { MetadataRoute } from "next";

// Gør det muligt at lægge siden på telefonens hjemmeskærm som en app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nyborg Triathlon Klub",
    short_name: "NyborgTri",
    description: "Træning, kalender og fællesskab i Nyborg Triathlon Klub",
    start_url: "/min-side",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#454e5c",
    lang: "da",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
