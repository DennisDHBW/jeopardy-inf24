import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typedRoutes: true,
  serverActions: {
    // Allow larger request bodies for file uploads in server actions (e.g. avatar upload).
    // Adjust as needed; keep reasonably small in production.
    bodySizeLimit: "10mb",
  },
};

export default nextConfig;
