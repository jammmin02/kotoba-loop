import "server-only";

import { announcementPhase } from "@/lib/announcement-window";
import type { Announcement, Prisma } from "@/lib/generated/prisma/client";
import type { AdminAnnouncement } from "@/types/announcement";

/** 노출 조건: starts_at <= now < ends_at (ends_at이 없으면 계속). 경계에서 시작은 포함, 종료는 제외다. */
export function activeAnnouncementWhere(now: Date): Prisma.AnnouncementWhereInput {
  return {
    starts_at: { lte: now },
    OR: [{ ends_at: null }, { ends_at: { gt: now } }],
  };
}

export function toAdminAnnouncement(a: Announcement, now: Date): AdminAnnouncement {
  const phase = announcementPhase(a.starts_at, a.ends_at, now);
  return {
    id: a.id,
    title: a.title,
    body: a.body,
    level: a.level,
    isPinned: a.is_pinned,
    startsAt: a.starts_at.toISOString(),
    endsAt: a.ends_at?.toISOString() ?? null,
    createdAt: a.created_at.toISOString(),
    phase,
  };
}
