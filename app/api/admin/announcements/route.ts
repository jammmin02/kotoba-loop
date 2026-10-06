import { toAdminAnnouncement } from "@/lib/announcements";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { announcementInputSchema } from "@/lib/validations/announcement";
import type { AdminAnnouncement } from "@/types/announcement";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (): Promise<AdminAnnouncement[]> => {
  await requireAdmin();
  const now = new Date();
  const rows = await db.announcement.findMany({ orderBy: { created_at: "desc" }, take: 100 });
  return rows.map((a) => toAdminAnnouncement(a, now));
});

export const POST = withApiHandler(async (req: NextRequest): Promise<AdminAnnouncement> => {
  const admin = await requireAdmin();
  const input = announcementInputSchema.parse(await req.json());

  const created = await db.$transaction(async (tx) => {
    const row = await tx.announcement.create({
      data: {
        title: input.title,
        body: input.body,
        level: input.level,
        starts_at: input.startsAt ? new Date(input.startsAt) : new Date(),
        ends_at: input.endsAt ? new Date(input.endsAt) : null,
        is_pinned: input.isPinned,
        created_by: admin.id,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        admin_id: admin.id,
        target_user_email: "(시스템)",
        action: "CREATE_ANNOUNCEMENT",
        target_label: row.title,
      },
    });
    return row;
  });

  return toAdminAnnouncement(created, new Date());
});
