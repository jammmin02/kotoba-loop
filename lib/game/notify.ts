import { achievementToast } from "@/components/game/achievement-toast";
import { expToast } from "@/components/game/exp-toast";
import { levelUpGlow } from "@/components/game/level-up-store";
import { questCompleteGlow } from "@/components/game/quest-complete-store";
import { petMotion } from "@/components/pet/pet-motion-store";
import { toast } from "@/components/ui/toast";
import { PET_STAGE_LABELS } from "@/lib/pet/constants";
import type { GameProfileGain } from "@/types/game";

import type { QueryClient } from "@tanstack/react-query";

export interface NotifyGameProfileGainOptions {
  /** 이 EXP 지급이 퀴즈 정답으로 발생했을 때만 true — 펫 "기쁨" 모션 트리거용(PROMPT 19/20). */
  quizCorrect?: boolean;
}

/**
 * EXP를 지급하는 API 응답(review-result/quiz submit/sentence 저장)을 받은 뒤 공통으로
 * 호출한다 — 토스트 표시, 레벨업/퀘스트 완료 glow 예약, 다음에 Level Badge/EXP Bar/Quest
 * Card가 최신값을 보여주도록 관련 쿼리 무효화까지 한 번에 처리한다.
 */
export function notifyGameProfileGain(
  queryClient: QueryClient,
  gain: GameProfileGain,
  options: NotifyGameProfileGainOptions = {},
): void {
  if (gain.expGained > 0) {
    expToast.show(gain.expGained);
  }
  if (gain.leveledUp) {
    levelUpGlow.markPending();
  }
  questCompleteGlow.markPending(gain.completedQuestCodes);
  gain.unlockedAchievements.forEach((achievement) => achievementToast.show(achievement.title));

  if (gain.petGrowth) {
    const { newStage, justGraduated } = gain.petGrowth;
    petMotion.markPending("sparkle");
    toast.success(
      justGraduated
        ? "펫이 훌륭하게 다 자랐어요! 졸업하고 새로운 펫을 골라보세요."
        : `펫이 ${PET_STAGE_LABELS[newStage]} 단계로 자랐어요!`,
    );
    queryClient.invalidateQueries({ queryKey: ["pet", "active"] });
  } else if (options.quizCorrect) {
    petMotion.markPending("happy");
  }

  queryClient.invalidateQueries({ queryKey: ["game", "profile"] });
  queryClient.invalidateQueries({ queryKey: ["study", "quests"] });
  if (gain.unlockedAchievements.length > 0) {
    queryClient.invalidateQueries({ queryKey: ["game", "achievements"] });
  }
}
