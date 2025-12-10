import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude PDFKit from bundling to avoid font path issues
  serverExternalPackages: ["pdfkit"],
  // Empty turbopack config to silence warning
  turbopack: {},
};

export default nextConfig;
