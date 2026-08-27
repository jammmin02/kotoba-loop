import { analyzeWeakness } from "@/lib/ai/weakness-analysis";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { toKstDateKey } from "@/lib/datetime";
import { getQuizTypeAccuracy, hasEnoughDataForWeakness } from "@/lib/study/weakness";
import type { WeaknessAnalysisResponse } from "@/types/stats";

export const GET = withApiHandler(async (): Promise<WeaknessAnalysisResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const userId = session.user.id;
  const accuracyByType = await getQuizTypeAccuracy(userId);

  if (!hasEnoughDataForWeakness(accuracyByType)) {
    return { accuracyByType, hasEnoughData: false, comment: null };
  }

  // AI 실패는 통계 화면 전체를 죽이지 않고 정답률 수치만 보여주는 쪽으로 폴백한다 — 이 라우트는
  // 페이지 로드 경로라 word-analysis처럼 사용자가 재시도를 직접 트리거하는 액션이 아니다.
  try {
    const { result } = await analyzeWeakness(userId, accuracyByType, toKstDateKey(new Date()));
    return { accuracyByType, hasEnoughData: true, comment: result.comment };
  } catch (err) {
    console.error("[weakness-analysis] AI 호출 실패", err);
    return { accuracyByType, hasEnoughData: true, comment: null };
  }
});
