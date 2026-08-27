"use client";

import { PixelChevronDown, PixelFlame } from "@/components/icons/pixel-icons";
import { cardVariants } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function buildDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export interface StudyCalendarProps {
  year: number;
  month: number;
  /** KST 기준 "YYYY-MM-DD" 목록 — 그 달 안에서 학습 기록이 있는 날짜. */
  studiedDates: string[];
  /** KST 기준 "YYYY-MM-DD" 목록 — 스트릭 프리즈로 보호된(건너뛰었지만 끊기지 않은) 날짜
   * (PROMPT 27.5). studiedDates와 겹치지 않는다. */
  protectedDates?: string[];
  /** KST 날짜("YYYY-MM-DD") → 그날 새로 등록한 단어 수. 없는 날은 표시하지 않는다. */
  registeredCounts?: Record<string, number>;
  /** 서버 기준 오늘, "YYYY-MM-DD". */
  todayKey: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  className?: string;
}

/**
 * 월 단위 학습 캘린더(PROMPT 26). year/month는 이미 해석된 값을 그대로 그리기만 하고,
 * 월 이동은 부모(StreakCalendarView)가 상태를 들고 API를 다시 호출하는 방식으로 처리한다
 * (컴포넌트 자체는 순수 표시 담당).
 */
export function StudyCalendar({
  year,
  month,
  studiedDates,
  protectedDates = [],
  registeredCounts = {},
  todayKey,
  onPrevMonth,
  onNextMonth,
  className,
}: StudyCalendarProps) {
  const studiedSet = new Set(studiedDates);
  const protectedSet = new Set(protectedDates);
  // UTC로 계산해도 "그 달의 며칠인지/1일이 무슨 요일인지"는 로컬 타임존과 무관하게 항상
  // 같은 값이 나온다 — 실제 KST 경계 판정(어떤 날짜가 학습일인지)은 서버가 이미 끝낸 뒤라
  // 여기서는 순수 달력 레이아웃 계산일 뿐이다.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className={cn(className)}>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="이전 달"
          className={cn(cardVariants(), "flex size-8 items-center justify-center")}
        >
          <PixelChevronDown className="size-4 rotate-90" aria-hidden="true" />
        </button>
        <span className="text-sm font-extrabold text-foreground">
          {year}년 {month}월
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="다음 달"
          className={cn(cardVariants(), "flex size-8 items-center justify-center")}
        >
          <PixelChevronDown className="size-4 -rotate-90" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-foreground/50">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} aria-hidden="true" />;

          const dateKey = buildDateKey(year, month, day);
          const studied = studiedSet.has(dateKey);
          const protectedDay = !studied && protectedSet.has(dateKey);
          const isToday = dateKey === todayKey;
          const registeredCount = registeredCounts[dateKey] ?? 0;

          return (
            <div
              key={dateKey}
              aria-label={
                (studied
                  ? `${month}월 ${day}일, 학습함`
                  : protectedDay
                    ? `${month}월 ${day}일, 스트릭 프리즈로 보호됨`
                    : `${month}월 ${day}일`) +
                (registeredCount > 0 ? `, 단어 ${registeredCount}개 등록` : "")
              }
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-0.5 rounded-none border-2 text-[11px] font-bold",
                studied || protectedDay
                  ? "border-pixel-ink bg-surface text-foreground shadow-pixel-sm"
                  : "border-transparent text-foreground/40",
                isToday && "border-accent",
              )}
            >
              {studied && <PixelFlame className="size-3.5 text-accent" aria-hidden="true" />}
              {protectedDay && (
                <span className="text-xs leading-none" aria-hidden="true">
                  ❄️
                </span>
              )}
              <span>{day}</span>
              {registeredCount > 0 && (
                <span className="text-[9px] leading-none font-extrabold text-primary">
                  +{registeredCount}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
