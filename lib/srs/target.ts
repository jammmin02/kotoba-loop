import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { applyReview } from "@/lib/srs/engine";
import type { LearningStatus, ReviewGrade, SrsState, SrsUpdate } from "@/lib/srs/types";

/** `db` 싱글턴(`lib/db.ts`)이나 `$transaction` 콜백의 `tx` 둘 다 받을 수 있게 하는 공용 타입 —
 *  `@/lib/db`를 직접 import하지 않아 시딩/검증 스크립트 같은 Next 런타임 밖에서도 그대로
 *  재사용할 수 있다(호출자가 자신의 PrismaClient 인스턴스를 넘기면 된다). */
type SrsClient = PrismaClient | Prisma.TransactionClient;

/** PROMPT 16 SRS 엔진이 다루는 두 대상 — 단어(`UserVocabulary`)와 한자(`UserKanji`). */
export const SRS_TARGET_TYPES = ["vocab", "kanji"] as const;
export type SrsTargetType = (typeof SRS_TARGET_TYPES)[number];

/** 아직 한 번도 리뷰한 적 없는 대상의 기본 상태 — `UserVocabulary`는 단어 등록 시 항상 이
 *  상태로 행이 먼저 생기지만, `UserKanji`는 첫 리뷰 전까지 행 자체가 없으므로 이 기본값을
 *  대신 사용한다(PROMPT 35). */
export const DEFAULT_SRS_STATE: SrsState = {
  intervalStage: 0,
  learningStatus: "NEW",
  correctCount: 0,
  wrongCount: 0,
};

interface SrsRow {
  interval_stage: number;
  learning_status: LearningStatus;
  correct_count: number;
  wrong_count: number;
}

function stateFromRow(row: SrsRow): SrsState {
  return {
    intervalStage: row.interval_stage,
    learningStatus: row.learning_status,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
  };
}

function updateColumns(update: SrsUpdate, now: Date) {
  return {
    interval_stage: update.intervalStage,
    learning_status: update.learningStatus,
    correct_count: update.correctCount,
    wrong_count: update.wrongCount,
    last_reviewed_at: now,
    next_review_at: update.nextReviewAt,
  };
}

/**
 * PROMPT 16의 `applyReview`(순수 함수)를 `target_type`으로 파라미터화해 vocab/kanji 양쪽에
 * 재사용한다(PROMPT 35) — 새 SRS 로직을 다시 만들지 않고, 이미 조회해 둔 현재 상태 행(또는
 * 아직 없으면 `null`)에 grade를 적용한 뒤 알맞은 테이블에 반영한다.
 *
 * 호출자가 소유권 검증(vocab의 `requireOwnedVocabulary` 등)과 행 조회는 각자 책임지고, 이
 * 함수는 "상태 계산 + 저장"만 담당한다 — 대상별 존재/권한 의미가 다르기 때문이다(단어는
 * 등록되지 않은 id면 404, 한자는 UserKanji가 없으면 그냥 아직 안 배운 것).
 */
export async function persistTargetReview(
  client: SrsClient,
  targetType: SrsTargetType,
  userId: string,
  targetId: string,
  currentRow: SrsRow | null,
  grade: ReviewGrade,
  now: Date,
): Promise<SrsUpdate> {
  const update = applyReview(currentRow ? stateFromRow(currentRow) : DEFAULT_SRS_STATE, grade, now);
  const data = updateColumns(update, now);

  if (targetType === "vocab") {
    await client.userVocabulary.update({
      where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: targetId } },
      data,
    });
  } else {
    await client.userKanji.upsert({
      where: { user_id_kanji_id: { user_id: userId, kanji_id: targetId } },
      create: { user_id: userId, kanji_id: targetId, ...data },
      update: data,
    });
  }

  return update;
}
