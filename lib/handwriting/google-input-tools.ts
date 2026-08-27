import "server-only";

import { ApiError } from "@/lib/api/error";
import type { HandwritingRecognizeInput } from "@/lib/validations/handwriting";

const ENDPOINT = "https://www.google.com/inputtools/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8";
const TIMEOUT_MS = 8_000;
const MAX_CANDIDATES = 10;

/**
 * Google Input Tools' handwriting recognizer has no official API, key, or published contract —
 * chosen anyway (2026-08-25 handwriting search decision) to avoid standing up new stroke-order
 * data or an ML model just for this. The request/response shape below was confirmed by
 * inspecting known open-source clients (e.g. handwriting.js): posting ink coordinates returns
 * `["SUCCESS", [[query, [candidates...], {}, {}]]]` on success, or some other shape when nothing
 * was recognized. Because that contract is unofficial and could change without notice, any
 * mismatch is treated as "no candidates" rather than thrown as an error.
 */
export async function recognizeHandwriting(
  input: HandwritingRecognizeInput,
  language = "ja",
): Promise<string[]> {
  const ink = input.strokes.map((stroke) => [stroke.x, stroke.y, stroke.t]);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        options: "enable_pre_space",
        requests: [
          {
            writing_guide: { writing_area_width: input.width, writing_area_height: input.height },
            ink,
            language,
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("EXTERNAL_API_ERROR", "손글씨 인식 서비스 응답이 지연되고 있습니다.");
    }
    throw new ApiError("EXTERNAL_API_ERROR", "손글씨 인식 서비스에 연결할 수 없습니다.");
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new ApiError("EXTERNAL_API_ERROR", "손글씨 인식 서비스가 오류를 반환했습니다.");
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return [];
  }

  const candidates =
    Array.isArray(json) && json[0] === "SUCCESS" && Array.isArray(json[1]) && Array.isArray(json[1][0])
      ? json[1][0][1]
      : undefined;
  if (!Array.isArray(candidates)) return [];

  const unique = [...new Set(candidates.filter((c): c is string => typeof c === "string"))];
  return unique.slice(0, MAX_CANDIDATES);
}
