import type { NextConfig } from "next";
import path from "path";

const config: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  outputFileTracingRoot: path.join(__dirname, "./"),
};

export default config;
