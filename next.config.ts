import type { NextConfig } from "next";

const isDesktopRuntime = process.env.NEXT_PUBLIC_DESKTOP_RUNTIME === "tauri";

const nextConfig: NextConfig = {
  output: "export",
  assetPrefix: isDesktopRuntime ? "./" : undefined
};

export default nextConfig;
