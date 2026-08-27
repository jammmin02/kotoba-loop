"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { QuestCard } from "@/components/game/quest-card";
import {
  QUEST_COMPLETE_GLOW_DISPLAY_MS,
  useQuestCompletePending,
} from "@/components/game/quest-complete-store";
import { ApiClientError, apiFetch } from "@/lib/api/client";
import type { DailyQuestItem, DailyQuestsResponse } from "@/types/quest";

interface DailyQuestCardProps {
  quest: DailyQuestItem;
  justCompleted: boolean;
  onGlowDone: () => void;
}

/** `GameProfileHeader`(components/game/game-profile-header.tsx)의 레벨업 glow 소비 패턴과
 * 동일하다 — 실제로 화면에 보이는 이 순간에만 체크 애니메이션을 재생하고, 끝나면 pending을
 * 지운다. */
function DailyQuestCard({ quest, justCompleted, onGlowDone }: DailyQuestCardProps) {
  useEffect(() => {
    if (!justCompleted) return;
    const timer = setTimeout(onGlowDone, QUEST_COMPLETE_GLOW_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [justCompleted, onGlowDone]);

  return (
    <QuestCard
      title={quest.title}
      current={quest.current}
      target={quest.target}
      rewardExp={quest.rewardExp}
      justCompleted={justCompleted}
    />
  );
}

/**
 * 오늘의 학습(PROMPT 17) 화면 상단의 Daily Quest 목록(PROMPT 25). 학습 액션 API가
 * `lib/game/notify.ts`를 통해 이 쿼리를 무효화하므로, 세션 화면(다른 라우트)에서 진행도가
 * 바뀌어도 이 화면으로 돌아오면 항상 최신 값을 보여준다. 방금 완료된 퀘스트 코드는 같은 notify
 * 경로가 `questCompleteGlow`에 남겨두므로, 여기서 처음 마운트될 때도 체크 애니메이션이 재생된다.
 */
export function QuestListView() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["study", "quests"],
    queryFn: () => apiFetch<DailyQuestsResponse>("/api/study/quests"),
  });
  const [pendingCodes, clearPending] = useQuestCompletePending();

  if (isLoading) return null;

  if (isError) {
    return (
      <p className="text-xs text-error">
        {error instanceof ApiClientError ? error.message : "오늘의 퀘스트를 불러오지 못했습니다."}
      </p>
    );
  }

  const quests = data?.quests ?? [];
  if (quests.length === 0) return null;

  return (
    <ul className="flex w-full max-w-md flex-col gap-2">
      {quests.map((quest) => (
        <li key={quest.code}>
          <DailyQuestCard
            quest={quest}
            justCompleted={quest.isCompleted && pendingCodes.includes(quest.code)}
            onGlowDone={() => clearPending(quest.code)}
          />
        </li>
      ))}
    </ul>
  );
}
