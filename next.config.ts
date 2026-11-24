import type { NextConfig } from "next";

// Grundlæggende sikkerhedsheadere: siden må ikke vises i en iframe hos andre (clickjacking), ingen MIME-gæt,
// ingen fuld adresse i Referer til andre sider, og browserens kamera/mikrofon/position er slået fra.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Billeder fra telefonen kan fylde et par MB; de skaleres ned på serveren (src/lib/upload.ts)
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // Billeder fra den gamle WordPress-side, indtil de er flyttet til egen lagring
    remotePatterns: [
      { protocol: "https", hostname: "www.nyborgtri.dk" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
