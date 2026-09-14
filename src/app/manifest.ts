import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LifeForge RPG",
    short_name: "LifeForge",
    description: "Personal Life RPG and Life OS",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    theme_color: "#0b1220",
    background_color: "#0b1220",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}