import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/inventory",
    name: "TBS Operations Yard Companion",
    short_name: "TBS Yard",
    description: "Receive, locate, move, verify, and manage TBS project material in the yard.",
    start_url: "/inventory",
    scope: "/",
    display: "standalone",
    background_color: "#f5f5f5",
    theme_color: "#014f6e",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Find project material", short_name: "Find material", url: "/inventory", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] },
      { name: "Receive material", short_name: "Receiving", url: "/inventory/receiving", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] },
      { name: "Move material", short_name: "Movements", url: "/inventory/movements", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] },
    ],
  }
}

