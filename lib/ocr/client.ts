import "server-only";

import os from "node:os";
import path from "node:path";

import sharp from "sharp";
import { OEM, createWorker } from "tesseract.js";

/**
 * Only the Japanese LSTM (fast) model ships with this app (public/tesseract/jpn.traineddata,
 * from tesseract-ocr/tessdata_fast) so a request never has to fetch it from the jsdelivr CDN
 * tesseract.js otherwise defaults to — that would add network latency to every OCR call and
 * fail entirely in an environment with no outbound internet access.
 */
const LANG_PATH = path.join(process.cwd(), "public", "tesseract");

/**
 * The only writable path in a Vercel Function at runtime is `/tmp` — `os.tmpdir()` resolves to
 * exactly that in production and to the OS temp dir locally, so this works unmodified in both.
 * Only used by tesseract.js to cache the language data it reads from LANG_PATH; harmless if the
 * write is ever rejected (tesseract.js treats a cache-write failure as non-fatal).
 */
const CACHE_PATH = os.tmpdir();

/**
 * Next.js/webpack bundling breaks tesseract.js's own path auto-detection for its worker script
 * (spawned via Node's `worker_threads`, which needs a real file on disk) and its wasm core
 * (loaded via `require("tesseract.js-core/...")`) — both assume they still live at their
 * original node_modules location. `serverExternalPackages` in next.config.ts keeps this package
 * un-bundled so that continues to hold, and these explicit paths are a second layer of defense
 * against path resolution failing in a bundled/serverless environment.
 */
const WORKER_SCRIPT_PATH = path.join(
  process.cwd(),
  "node_modules",
  "tesseract.js",
  "src",
  "worker-script",
  "node",
  "index.js",
);
const CORE_PATH = path.join(process.cwd(), "node_modules", "tesseract.js-core");

/** Thrown by `recognizeJapaneseText` when OCR exceeds its internal budget — see OCR_TIMEOUT_MS. */
export class OcrTimeoutError extends Error {}

/**
 * Kept comfortably under the route's `maxDuration = 60` (next.config.ts / route.ts) so a slow
 * photo gets a clean `OCR_TIMEOUT` API response instead of Vercel abruptly killing the function
 * mid-request.
 */
export const OCR_TIMEOUT_MS = 50_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new OcrTimeoutError(`OCR timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export interface RecognizeResult {
  text: string;
  confidence: number;
}

/**
 * Camera photos routinely come in at 3000px+ on a side (lib/validations/photo-upload.ts's
 * PHOTO_MAX_BYTES comment: "5-10MB range"). Tesseract.js gains nothing from that much detail for
 * printed text and its runtime scales with pixel count, so an unscaled photo can blow past
 * OCR_TIMEOUT_MS (and the route's maxDuration) on nothing but sheer resolution.
 */
const OCR_MAX_DIMENSION = 2000;

/** Best-effort — an image sharp can't decode (e.g. an edge-case HEIC variant) just skips scaling. */
async function prepareForOcr(image: Buffer): Promise<Buffer> {
  try {
    return await sharp(image)
      .resize({
        width: OCR_MAX_DIMENSION,
        height: OCR_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();
  } catch (err) {
    console.error("[ocr] downscale failed, using original image", err);
    return image;
  }
}

/**
 * Runs Tesseract.js (server-in-process, not an external API — see kotoba-loop-roadmap.md C.1's
 * 2026-08-25 OCR provider decision) against `image` and returns the raw recognized text.
 * Spawns and tears down a worker per call rather than pooling one, matching tesseract.js's own
 * guidance for serverless environments (no state persists across invocations anyway).
 */
export async function recognizeJapaneseText(image: Buffer): Promise<RecognizeResult> {
  const prepared = await prepareForOcr(image);

  const worker = await createWorker("jpn", OEM.LSTM_ONLY, {
    workerPath: WORKER_SCRIPT_PATH,
    corePath: CORE_PATH,
    langPath: LANG_PATH,
    cachePath: CACHE_PATH,
    gzip: false,
    logger: () => {},
  });

  try {
    const { data } = await withTimeout(
      worker.recognize(prepared, {}, { text: true }),
      OCR_TIMEOUT_MS,
    );
    return { text: data.text, confidence: data.confidence };
  } finally {
    await worker.terminate().catch((err) => console.error("[ocr] worker terminate failed", err));
  }
}
