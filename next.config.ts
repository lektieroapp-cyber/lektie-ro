import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  env: {
    DEV_BYPASS_AUTH: process.env.DEV_BYPASS_AUTH ?? "",
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    // Next 16 whitelists allowed `quality` values per build to keep the
    // optimiser cache predictable. Default 75 covers most thumbnails;
    // 92 is for the Tavle hero illustration whose soft pot/leaf gradients
    // visibly band at q=75 on small render sizes (e.g. the 240px subject
    // header), so we explicitly opt that one image up.
    qualities: [75, 92],
  },
}

export default nextConfig
