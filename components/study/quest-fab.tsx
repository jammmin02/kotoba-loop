"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { PixelCheck, PixelFlag } from "@/components/icons/pixel-icons";
import { QuestListView } from "@/components/study/quest-list-view";
import { Modal } from "@/components/ui/modal";
import { apiFetch } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { DailyQuestsResponse } from "@/types/quest";

/**
 * 홈 화면 미션 진입점(PROMPT 26-1) — 데스크탑/모바일 모두 동일하게 플로팅 아이콘 +
 * 게임 퀘스트창 느낌의 모달(`Modal`, 데스크탑은 중앙 팝업·좁은 화면은 바텀시트로 정렬)로
 * 미션 목록을 연다. `["study", "quests"]` 쿼리키를 `QuestListView`(PROMPT 25)와 공유해
 * 뱃지 숫자와 모달 내부 목록이 항상 같은 캐시를 바라보게 한다.
 */
export function QuestFab({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["study", "quests"],
    queryFn: () => apiFetch<DailyQuestsResponse>("/api/study/quests"),
  });

  const quests = data?.quests ?? [];
  if (quests.length === 0) return null;

  const remaining = quests.filter((quest) => !quest.isCompleted).length;
  const allCompleted = remaining === 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={
          allCompleted
            ? "오늘의 미션 보기 (모두 완료)"
            : `오늘의 미션 보기 (${remaining}개 진행 중)`
        }
        className={cn(
          "fixed bottom-20 right-4 z-40 flex size-14 items-center justify-center rounded-none border-2 border-pixel-ink bg-accent text-accent-foreground shadow-glow transition-[transform,box-shadow] duration-100 hover:brightness-110 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:bottom-6",
          className,
        )}
      >
        <PixelFlag className="size-6" aria-hidden="true" />
        {allCompleted ? (
          <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-none border-2 border-pixel-ink bg-success text-success-foreground">
            <PixelCheck className="size-3" aria-hidden="true" />
          </span>
        ) : (
          <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-none border-2 border-pixel-ink bg-error text-[10px] font-bold text-error-foreground">
            {remaining}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="QUEST.EXE">
        <QuestListView />
      </Modal>
    </>
  );
}
