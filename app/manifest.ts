import type { MetadataRoute } from "next";

// D.2 design tokens (kotoba-loop-roadmap.md): Background(Light) periwinkle for the
// splash-screen background, Primary indigo for the OS install UI accent color.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kotoba-loop — AI 일본어 단어·한자 학습",
    short_name: "kotoba-loop",
    description: "AI 기반 일본어 단어·한자 학습 웹 서비스",
    start_url: "/",
    display: "standalone",
    background_color: "#c9c6f2",
    theme_color: "#5b5fef",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
