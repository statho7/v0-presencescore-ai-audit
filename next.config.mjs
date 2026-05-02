import { withWorkflow } from "workflow/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default withWorkflow(nextConfig);
