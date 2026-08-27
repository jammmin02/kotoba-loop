// Regenerates the PWA brand icon (app/icon.png, app/apple-icon.png,
// public/icons/icon-*.png) from the master artwork at scripts/icon-source.png,
// using `sharp` (already a Next.js dependency for image optimization — no new
// package). Run after replacing the source art: `npm run icons:generate`.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "scripts/icon-source.png");

// Fraction of the maskable canvas the trimmed artwork should occupy along its
// longest side — leaves a safe margin so Android's circular/squircle adaptive
// mask doesn't clip the cat or the book.
const MASKABLE_CONTENT_FRACTION = 0.6;

async function backgroundColor() {
  const [r, g, b] = await sharp(SOURCE)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer();
  return { r, g, b };
}

// "any" purpose icon: the source art as-is (it's already full-bleed) — used
// for the favicon, the apple-touch icon, and the non-maskable manifest icon.
async function renderAny(size, outFile) {
  await sharp(SOURCE).resize(size, size).png().toFile(outFile);
}

// "maskable" purpose icon: trim the source down to its actual artwork, shrink
// it to fit the safe zone, and re-pad it onto a fresh square of the sampled
// background color.
async function renderMaskable(size, outFile, background) {
  const trimmed = await sharp(SOURCE).trim({ threshold: 20 }).toBuffer();
  const { width, height } = await sharp(trimmed).metadata();

  const targetContent = Math.round(size * MASKABLE_CONTENT_FRACTION);
  const scale = targetContent / Math.max(width, height);
  const resized = await sharp(trimmed)
    .resize(Math.round(width * scale), Math.round(height * scale))
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 3, background } })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(outFile);
}

async function main() {
  const background = await backgroundColor();

  const iconsDir = path.join(ROOT, "public/icons");
  await mkdir(iconsDir, { recursive: true });

  await Promise.all([
    renderAny(192, path.join(ROOT, "app/icon.png")),
    renderAny(180, path.join(ROOT, "app/apple-icon.png")),
    renderAny(192, path.join(iconsDir, "icon-192.png")),
    renderAny(512, path.join(iconsDir, "icon-512.png")),
    renderMaskable(512, path.join(iconsDir, "icon-512-maskable.png"), background),
  ]);

  console.log(
    "Generated app/icon.png, app/apple-icon.png, public/icons/icon-{192,512,512-maskable}.png",
  );
}

main();
