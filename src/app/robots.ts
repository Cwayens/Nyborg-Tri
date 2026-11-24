import type { MetadataRoute } from "next";

// Søgemaskiner skal ikke indeksere login, admin, betalingslinks eller medlemssider.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/betal", "/login", "/min-side", "/profil", "/kalender", "/chat", "/traener", "/leaderboard", "/statistik", "/benchmarks", "/forbindelser", "/aktiviteter", "/traen-sammen", "/klubben"],
    }],
  };
}
