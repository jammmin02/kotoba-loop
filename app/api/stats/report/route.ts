import { withAnalysisCache } from "@/lib/ai/cache";
import { analyzeReportRecommendation } from "@/lib/ai/report-recommendation";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { toKstDateKey } from "@/lib/datetime";
import { db } from "@/lib/db";
import { resolveReportPeriod } from "@/lib/study/report";
import { getReportStats } from "@/lib/study/report-stats";
import { getWeakKanjiStats } from "@/lib/study/weak-kanji";
import { getQuizTypeAccuracy, hasEnoughDataForWeakness } from "@/lib/study/weakness";
import { reportQuerySchema } from "@/lib/validations/report";
import type { ReportWeakKanjiItem, StatsReportResponse } from "@/types/stats";

import type { NextRequest } from "next/server";

/**
 * 주간/월간 AI 리포트(PROMPT 44, 계획서 53장). 완결된 캘린더 주/월만 다루므로, 같은 기간을
 * 다시 요청해도 값이 바뀌지 않는다 — 집계 수치 + 취약점 요약 + AI 코멘트 전체를
 * `AIAnalysis`(analysis_type="weekly_report"|"monthly_report") 한 캐시 단위로 묶어
 * "배치성으로 한 번만 계산" 요구사항을 만족시킨다(요청마다 재계산하지 않음).
 */
export const GET = withApiHandler(async (req: NextRequest): Promise<StatsReportResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  const userId = session.user.id;

  const { kind, offset } = reportQuerySchema.parse({
    kind: req.nextUrl.searchParams.get("kind") ?? undefined,
    offset: req.nextUrl.searchParams.get("offset") ?? undefined,
  });

  const period = resolveReportPeriod(kind, new Date(), offset);

  const { data } = await withAnalysisCache({
    userId,
    analysisType: kind === "week" ? "weekly_report" : "monthly_report",
    inputRef: period.key,
    run: async () => {
      const [stats, accuracyByType, weakKanjiStats] = await Promise.all([
        getReportStats(userId, period),
        getQuizTypeAccuracy(userId),
        getWeakKanjiStats(userId),
      ]);

      const kanjiRows = weakKanjiStats.length
        ? await db.kanji.findMany({
            where: { id: { in: weakKanjiStats.map((row) => row.kanjiId) } },
            select: { id: true, character: true, meaning: true },
          })
        : [];
      const kanjiById = new Map(kanjiRows.map((row) => [row.id, row]));

      const weakKanji: ReportWeakKanjiItem[] = weakKanjiStats.flatMap((row) => {
        const kanji = kanjiById.get(row.kanjiId);
        if (!kanji) return [];
        return [
          {
            kanjiId: row.kanjiId,
            character: kanji.character,
            meaning: kanji.meaning,
            recentCount: row.recentCount,
            recentWrongCount: row.recentWrongCount,
            wrongRate: row.wrongRate,
          },
        ];
      });

      const hasActivityData = stats.reviewCount > 0;

      // 첫 주/첫 달처럼 활동이 전혀 없는 기간은 AI 호출 자체를 생략한다(근거 수치가 없어
      // 코멘트를 만들 수 없음). AI 실패는 weakness/route.ts와 동일하게 리포트 화면 전체를
      // 죽이지 않고 comment만 null로 폴백한다.
      let comment: string | null = null;
      if (hasActivityData) {
        try {
          const result = await analyzeReportRecommendation(
            kind,
            period.label,
            stats,
            accuracyByType,
            weakKanji,
          );
          comment = result.comment;
        } catch (err) {
          console.error("[report-recommendation] AI 호출 실패", err);
          comment = null;
        }
      }

      return {
        stats,
        weakness: { accuracyByType, hasEnoughData: hasEnoughDataForWeakness(accuracyByType) },
        weakKanji,
        hasActivityData,
        comment,
      };
    },
  });

  return {
    kind,
    period: {
      key: period.key,
      label: period.label,
      startDate: toKstDateKey(period.start),
      // period.end는 다음 구간의 시작(exclusive)이므로 1ms 앞선 순간의 날짜 키가 "마지막 날"이다.
      endDate: toKstDateKey(new Date(period.end.getTime() - 1)),
    },
    ...data,
  };
});
