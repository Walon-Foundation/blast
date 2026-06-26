import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "blast",
    short_name: "blast",
    description: "API load testing and mock server. One config file. Two tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#f97316",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
