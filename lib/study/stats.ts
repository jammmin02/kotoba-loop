import "server-only";

import { addKstDays, startOfKstDay, startOfKstMonth, startOfKstRollingWeek } from "@/lib/datetime";
import { db } from "@/lib/db";
import type { LearningStatus } from "@/lib/srs/types";

export interface WordStatusCounts {
  total: number;
  new: number;
  learning: number;
  review: number;
  weak: number;
  mastered: number;
}

export interface StudyPeriodCounts {
  today: number;
  week: number;
  month: number;
}

export interface KanjiStatusCounts {
  /** 常用漢字 전체 개수(항상 2,136 — PROMPT 33이 한 번에 전량 시딩하고 이후 고정한다). */
  total: number;
  new: number;
  learning: number;
  review: number;
  weak: number;
  mastered: number;
  /** mastered / total을 백분율(소수 1자리)로 반환 — 계획서 31장 "982/2,136, 45.9%"의 %. */
  rate: number;
}

/**
 * `UserVocabulary.learning_status` 기준 단어 상태별 집계. 신규 계정처럼 등록 단어가
 * 전혀 없으면 groupBy가 빈 배열을 반환하므로, 모든 필드가 자연히 0으로 채워진다.
 */
export async function getWordStatusCounts(userId: string): Promise<WordStatusCounts> {
  const rows = await db.userVocabulary.groupBy({
    by: ["learning_status"],
    where: { user_id: userId },
    _count: { _all: true },
  });
  const countByStatus = new Map<LearningStatus, number>(
    rows.map((row) => [row.learning_status, row._count._all]),
  );
  const get = (status: LearningStatus) => countByStatus.get(status) ?? 0;

  const newCount = get("NEW");
  const learning = get("LEARNING");
  const review = get("REVIEW");
  const weak = get("WEAK");
  const mastered = get("MASTERED");

  return {
    total: newCount + learning + review + weak + mastered,
    new: newCount,
    learning,
    review,
    weak,
    mastered,
  };
}

/**
 * 常用漢字 2,136자 기준 학습 상태별 집계(PROMPT 35). 단어와 달리 `UserKanji`는 등록 시점에
 * 자동으로 생기지 않고 첫 리뷰(PROMPT 36 한자 퀴즈) 때 비로소 행이 만들어지므로, 행이 아예
 * 없는 한자는 전부 NEW로 간주해 `total`에서 나머지 상태 합을 뺀 값으로 채운다.
 */
export async function getKanjiStatusCounts(userId: string): Promise<KanjiStatusCounts> {
  const [total, rows] = await Promise.all([
    db.kanji.count(),
    db.userKanji.groupBy({
      by: ["learning_status"],
      where: { user_id: userId },
      _count: { _all: true },
    }),
  ]);

  const countByStatus = new Map<LearningStatus, number>(
    rows.map((row) => [row.learning_status, row._count._all]),
  );
  const get = (status: LearningStatus) => countByStatus.get(status) ?? 0;

  const learning = get("LEARNING");
  const review = get("REVIEW");
  const weak = get("WEAK");
  const mastered = get("MASTERED");
  const newCount = total - learning - review - weak - mastered;
  const rate = total === 0 ? 0 : Math.round((mastered / total) * 1000) / 10;

  return { total, new: newCount, learning, review, weak, mastered, rate };
}

/**
 * 오늘/이번 주/이번 달 학습량("학습 완료 건수")을 `ReviewHistory` 로그의 건수로 집계한다.
 * `UserVocabulary.last_reviewed_at`는 단어당 가장 최근 값만 남아 기간 누적을 셀 수 없어서,
 * 이번 주/이번 달처럼 하루보다 긴 구간은 반드시 이 로그 테이블을 써야 한다. 세 구간 모두
 * 상한을 "내일 KST 자정 직전"으로 둬, 시계 오차로 미래 시각이 찍힌 행이 섞여도 제외한다.
 */
export async function getStudyPeriodCounts(userId: string, now: Date): Promise<StudyPeriodCounts> {
  const startOfToday = startOfKstDay(now);
  const startOfTomorrow = addKstDays(startOfToday, 1);
  const startOfWeek = startOfKstRollingWeek(now);
  const startOfMonth = startOfKstMonth(now);

  const [today, week, month] = await Promise.all([
    db.reviewHistory.count({
      where: { user_id: userId, reviewed_at: { gte: startOfToday, lt: startOfTomorrow } },
    }),
    db.reviewHistory.count({
      where: { user_id: userId, reviewed_at: { gte: startOfWeek, lt: startOfTomorrow } },
    }),
    db.reviewHistory.count({
      where: { user_id: userId, reviewed_at: { gte: startOfMonth, lt: startOfTomorrow } },
    }),
  ]);

  return { today, week, month };
}
