import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js "N" badge that shows in the corner during `npm run dev`.
  // Build errors still show up as a full-screen overlay.
  devIndicators: false,
};

export default nextConfig;
