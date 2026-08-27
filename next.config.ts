import type { NextConfig } from "next";

const OCR_ROUTE = "/api/vocabulary-photos/[id]/ocr";

const nextConfig: NextConfig = {
  // tesseract.js spawns a worker_threads.Worker from a real file on disk and loads its wasm
  // core via `require("tesseract.js-core/...")` — both break if Next bundles the package
  // instead of loading it via native `require` (see lib/ocr/client.ts).
  serverExternalPackages: ["tesseract.js", "tesseract.js-core"],
  outputFileTracingIncludes: {
    // The OCR route reads public/tesseract/jpn.traineddata via `fs`, not HTTP — Next's default
    // file tracing doesn't know it's needed since Vercel normally serves `public/` from a CDN
    // and doesn't include it in the function bundle otherwise.
    [OCR_ROUTE]: ["./public/tesseract/**/*"],
  },
  outputFileTracingExcludes: {
    // Only the LSTM-only (fast) models are ever used (see lib/ocr/client.ts's OEM.LSTM_ONLY) —
    // the Legacy/combined-engine wasm variants would otherwise roughly double this route's
    // function bundle size for nothing.
    [OCR_ROUTE]: [
      "./node_modules/tesseract.js-core/tesseract-core.wasm*",
      "./node_modules/tesseract.js-core/tesseract-core-simd.wasm*",
      "./node_modules/tesseract.js-core/tesseract-core-relaxedsimd.wasm*",
    ],
  },
  async headers() {
    return [
      {
        // Never let the browser cache the service worker script itself — clients
        // must always fetch the latest one to detect updates.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
