import type { MetadataRoute } from "next";

/** Manifest PWA (Fase 1: instalable; service worker/offline en fase posterior). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "App Deportivo",
    short_name: "Deportivo",
    description:
      "Tu ecosistema deportivo: pronósticos, recompensas en Tickets y comunidad.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
