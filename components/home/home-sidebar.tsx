"use client";

import { StreakCalendarView } from "@/components/game/streak-calendar-view";
import { QuestListView } from "@/components/study/quest-list-view";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

/**
 * lg 이상 화면에서만 홈 우측에 얹는 보조 위젯 컬럼(오늘의 퀘스트 + 스트릭/캘린더) —
 * 모바일 레이아웃은 그대로 두고 넓은 화면에서 비는 공간을 채운다. 모바일에서 렌더링되지
 * 않도록 useMediaQuery로 마운트 자체를 막아, 이 컴포넌트들의 useQuery(퀘스트/게임 캘린더)가
 * 모바일에서 불필요하게 발생하지 않게 한다.
 */
export function HomeSidebar() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (!isDesktop) return null;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-extrabold text-foreground/70">오늘의 퀘스트</h2>
        <QuestListView />
      </div>
      <StreakCalendarView showHeading={false} />
    </div>
  );
}
