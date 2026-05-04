import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* pdfkit reads AFM fonts from node_modules/pdfkit/js/data via __dirname —
   * bundling breaks that path (ENOENT under C:\\ROOT\\...). Keep it external. */
  serverExternalPackages: ["pdfkit", "fontkit"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**", 
      },
    ],
  },
};

export default nextConfig;