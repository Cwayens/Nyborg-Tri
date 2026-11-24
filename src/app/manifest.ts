import type { MetadataRoute } from "next";

// Gør det muligt at lægge siden på telefonens hjemmeskærm som en app
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nyborg Triathlon Klub",
    short_name: "NyborgTri",
    description: "Træning, kalender og fællesskab i Nyborg Triathlon Klub",
    start_url: "/min-side",
    display: "standalone",
    background_color: "#0b2540",
    theme_color: "#0b2540",
    lang: "da",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
