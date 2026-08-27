import { addKstDays, startOfKstCalendarWeek, startOfKstMonth, toKstDateKey } from "@/lib/datetime";

/**
 * 리포트 기간 계산(순수 함수) — 다른 순수 로직(lib/study/exam-plan.ts, today-summary.ts)과
 * 같은 이유로 db/server-only 의존 없이 이 파일에 둔다. DB 집계는 lib/study/report-stats.ts.
 */

export type ReportKind = "week" | "month";

/** 너무 먼 과거까지 리포트를 조회하지 못하도록 offset 상한을 둔다(약 1년). */
export const MAX_REPORT_OFFSET = 52;

export interface ReportPeriod {
  kind: ReportKind;
  /** KST 00:00 기준 구간 시작(포함). */
  start: Date;
  /** KST 00:00 기준 구간 끝(미포함). */
  end: Date;
  /** 캐시 키 겸 API 식별자. week는 월요일 날짜("YYYY-MM-DD"), month는 "YYYY-MM". */
  key: string;
  /** 화면 표시용 라벨. */
  label: string;
}

function formatKstDateLabel(date: Date): string {
  return toKstDateKey(date).replace(/-/g, ".");
}

function formatKstMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${year}년 ${Number(month)}월`;
}

/**
 * 리포트가 다룰 기간을 계산한다. 리포트는 항상 "완결된" 캘린더 주(월~일)/월(1일~말일)만
 * 대상으로 한다 — 진행 중인 이번 주/이번 달은 이미 `/api/stats/summary`가 실시간으로
 * 보여주고 있고, 완결된 기간이어야 값이 더 이상 바뀌지 않아 배치성 캐시가 안전하다.
 * `offset`은 클라이언트가 순수 정수 증감만으로 과거 기간을 넘겨볼 수 있게 한다
 * (0 = 가장 최근에 완결된 기간, 1 = 그 이전 기간, ...).
 */
export function resolveReportPeriod(kind: ReportKind, now: Date, offset = 0): ReportPeriod {
  const safeOffset = Math.min(MAX_REPORT_OFFSET, Math.max(0, Math.trunc(offset)));

  if (kind === "week") {
    const currentWeekStart = startOfKstCalendarWeek(now);
    const start = addKstDays(currentWeekStart, -7 * (safeOffset + 1));
    const end = addKstDays(start, 7);
    return {
      kind,
      start,
      end,
      key: toKstDateKey(start),
      label: `${formatKstDateLabel(start)} ~ ${formatKstDateLabel(addKstDays(start, 6))}`,
    };
  }

  const start = startOfKstMonth(now, -(safeOffset + 1));
  const end = startOfKstMonth(start, 1);
  const key = toKstDateKey(start).slice(0, 7);
  return { kind, start, end, key, label: formatKstMonthLabel(key) };
}
