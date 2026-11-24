import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Billeder fra den gamle WordPress-side, indtil de er flyttet til egen lagring
    remotePatterns: [{ protocol: "https", hostname: "www.nyborgtri.dk" }],
  },
};

export default nextConfig;
