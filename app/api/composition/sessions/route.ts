import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { resolveTargetCount, type CompositionModeValue } from "@/lib/composition/config";
import { db } from "@/lib/db";
import { createCompositionSessionSchema } from "@/lib/validations/composition";

import type { NextRequest } from "next/server";

export interface CompositionSessionView {
  id: string;
  situation: string;
  vocabLevel: string;
  compositionLevel: string;
  tone: string;
  mode: CompositionModeValue;
  targetCount: number | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface CompositionSessionListItem extends CompositionSessionView {
  answeredCount: number;
  averageScore: number;
}

const HISTORY_LIMIT = 10;

export const POST = withApiHandler(async (req: NextRequest): Promise<CompositionSessionView> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");

  const input = createCompositionSessionSchema.parse(await req.json());

  const created = await db.compositionSession.create({
    data: {
      user_id: session.user.id,
      situation: input.situation,
      vocab_level: input.vocabLevel,
      composition_level: input.compositionLevel,
      tone: input.tone,
      mode: input.mode,
      target_count: resolveTargetCount(input.mode, input.customCount),
    },
  });

  return toView(created);
});

/** 최근 작문 세션 목록(기록 화면용). */
export const GET = withApiHandler(async (): Promise<CompositionSessionListItem[]> => {
  const session = await auth();
  if (!session?.user) throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");

  const rows = await db.compositionSession.findMany({
    where: { user_id: session.user.id, attempts: { some: {} } },
    orderBy: { created_at: "desc" },
    take: HISTORY_LIMIT,
    include: { attempts: { select: { score: true } } },
  });

  return rows.map((row) => {
    const scores = row.attempts.map((a) => a.score);
    return {
      ...toView(row),
      answeredCount: scores.length,
      averageScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0,
    };
  });
});

function toView(row: {
  id: string;
  situation: string;
  vocab_level: string;
  composition_level: string;
  tone: string;
  mode: string;
  target_count: number | null;
  created_at: Date;
  finished_at: Date | null;
}): CompositionSessionView {
  return {
    id: row.id,
    situation: row.situation,
    vocabLevel: row.vocab_level,
    compositionLevel: row.composition_level,
    tone: row.tone,
    mode: row.mode as CompositionModeValue,
    targetCount: row.target_count,
    createdAt: row.created_at.toISOString(),
    finishedAt: row.finished_at?.toISOString() ?? null,
  };
}
