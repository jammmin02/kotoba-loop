import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recognizeHandwriting } from "@/lib/handwriting/google-input-tools";
import { handwritingRecognizeSchema } from "@/lib/validations/handwriting";
import type { HandwritingRecognitionResult } from "@/types/handwriting";
import type { KanjiSummary } from "@/types/kanji";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(
  async (req: NextRequest): Promise<HandwritingRecognitionResult> => {
    const session = await auth();
    if (!session?.user) {
      throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
    }

    const body = handwritingRecognizeSchema.parse(await req.json());
    const rawCandidates = await recognizeHandwriting(body);

    if (rawCandidates.length === 0) {
      return { matches: [], rawCandidates: [] };
    }

    const rows = await db.kanji.findMany({
      where: { character: { in: rawCandidates } },
      select: {
        character: true,
        korean_reading: true,
        meaning: true,
        school_grade: true,
        jlpt_level_ref: true,
      },
    });

    const byCharacter = new Map(rows.map((row) => [row.character, row]));
    // Re-orders DB rows to follow the recognizer's ranked candidate order — `in` doesn't preserve it.
    const matches: KanjiSummary[] = rawCandidates.flatMap((character) => {
      const row = byCharacter.get(character);
      if (!row) return [];
      return [
        {
          character: row.character,
          koreanReading: row.korean_reading,
          meaning: row.meaning,
          schoolGrade: row.school_grade,
          jlptLevelRef: row.jlpt_level_ref,
        },
      ];
    });

    return { matches, rawCandidates };
  },
);
