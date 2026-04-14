import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  env: {
    DEV_BYPASS_AUTH: process.env.DEV_BYPASS_AUTH ?? "",
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default nextConfig
