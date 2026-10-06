export type AnnouncementPhase = "ACTIVE" | "SCHEDULED" | "ENDED";

/**
 * 공지의 노출 단계. 시작 시각은 포함, 종료 시각은 제외다(starts_at <= now < ends_at) — DB 조회 조건
 * (lib/announcements.ts의 activeAnnouncementWhere)과 반드시 같은 경계를 써야 한다.
 */
export function announcementPhase(
  startsAt: Date,
  endsAt: Date | null,
  now: Date,
): AnnouncementPhase {
  if (startsAt > now) return "SCHEDULED";
  if (endsAt && endsAt <= now) return "ENDED";
  return "ACTIVE";
}
