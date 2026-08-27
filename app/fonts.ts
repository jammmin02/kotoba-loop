import { Noto_Sans_JP } from "next/font/google";
import localFont from "next/font/local";

// Pretendard Variable — legible fallback for long-form Korean reading content
// (`.font-content`), used where the pixel typeface would hurt readability.
export const pretendard = localFont({
  src: "../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
  fallback: ["-apple-system", "BlinkMacSystemFont", "Malgun Gothic", "system-ui", "sans-serif"],
});

// Noto Sans JP — Japanese vocabulary/kanji content typeface. Kept for stroke
// legibility even though the rest of the UI is pixel-styled (`:lang(ja)` / `.font-jp`).
export const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  fallback: ["Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "sans-serif"],
});

// Galmuri — Korean/Japanese/Latin pixel typeface (OFL), site-wide UI chrome default.
export const galmuri = localFont({
  src: [
    { path: "../node_modules/galmuri/dist/Galmuri11.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/galmuri/dist/Galmuri11-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-galmuri",
  display: "swap",
  fallback: [
    "Pretendard",
    "-apple-system",
    "BlinkMacSystemFont",
    "Malgun Gothic",
    "system-ui",
    "sans-serif",
  ],
});
