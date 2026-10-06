export type AnnouncementLevel = "INFO" | "WARNING";

/** 사용자에게 노출되는 공지 */
export interface ActiveAnnouncement {
  id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  isPinned: boolean;
}

/** 관리자 목록용 — 노출 기간과 현재 상태를 포함한다. */
export interface AdminAnnouncement extends ActiveAnnouncement {
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
  /** 지금 노출 중인지, 예정인지, 종료됐는지 */
  phase: "ACTIVE" | "SCHEDULED" | "ENDED";
}
