import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SecureVault AI",
    short_name: "SecureVault",
    description: "Privacy-first, local-first secure vault with optional AI-assisted search.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e8",
    theme_color: "#0e6b5c",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}
