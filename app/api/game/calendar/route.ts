import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { addKstDays, startOfKstMonth, toKstDateKey } from "@/lib/datetime";
import {
  getProtectedCalendarDates,
  getStudyCalendarDates,
  getVocabularyRegistrationCounts,
} from "@/lib/study/calendar";
import { calendarQuerySchema } from "@/lib/validations/calendar";
import type { GameCalendarResponse } from "@/types/game";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (req: NextRequest): Promise<GameCalendarResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const { year, month } = calendarQuerySchema.parse({
    year: req.nextUrl.searchParams.get("year") ?? undefined,
    month: req.nextUrl.searchParams.get("month") ?? undefined,
  });

  const now = new Date();
  // UTC 기준 그 달의 15일 정오는 KST(+9h) 변환으로도 같은 달 안에 머물러, year/month를
  // "그 달에 속하는 임의의 한 순간"으로 안전하게 바꿀 수 있다.
  const anchor = year && month ? new Date(Date.UTC(year, month - 1, 15, 12)) : now;
  const monthStart = startOfKstMonth(anchor);
  // +32일은 어떤 달 길이(28~31일)에서도 확실히 다음 달로 넘어가므로, 그 순간을 다시
  // startOfKstMonth로 절단하면 "다음 달 1일 KST 자정"을 얻는다.
  const monthEndExclusive = startOfKstMonth(addKstDays(monthStart, 32));

  const [studiedDates, protectedDates, registeredCounts] = await Promise.all([
    getStudyCalendarDates(session.user.id, monthStart, monthEndExclusive),
    getProtectedCalendarDates(session.user.id, monthStart, monthEndExclusive),
    getVocabularyRegistrationCounts(session.user.id, monthStart, monthEndExclusive),
  ]);

  // now.getFullYear()/getMonth()는 서버 로컬 타임존 기준이라 KST와 어긋날 수 있으므로
  // 쓰지 않는다 — 이미 KST 자정으로 절단된 monthStart에서 그대로 뽑아낸다.
  const [resolvedYear, resolvedMonth] = toKstDateKey(monthStart).split("-").map(Number);

  return {
    year: resolvedYear,
    month: resolvedMonth,
    studiedDates,
    protectedDates,
    todayKey: toKstDateKey(now),
    registeredCounts,
  };
});
