import { activeAnnouncementWhere } from "@/lib/announcements";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActiveAnnouncement } from "@/types/announcement";

/** 지금 노출 중인 공지 — 고정 공지가 먼저, 그다음 최신순. */
export const GET = withApiHandler(async (): Promise<ActiveAnnouncement[]> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const rows = await db.announcement.findMany({
    where: activeAnnouncementWhere(new Date()),
    orderBy: [{ is_pinned: "desc" }, { starts_at: "desc" }],
    take: 10,
  });

  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    level: a.level,
    isPinned: a.is_pinned,
  }));
});
