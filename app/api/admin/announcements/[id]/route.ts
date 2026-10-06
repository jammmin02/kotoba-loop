import { toAdminAnnouncement } from "@/lib/announcements";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { announcementInputSchema } from "@/lib/validations/announcement";
import type { AdminAnnouncement } from "@/types/announcement";

import type { NextRequest } from "next/server";

export const PATCH = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/admin/announcements/[id]">,
  ): Promise<AdminAnnouncement> => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const input = announcementInputSchema.parse(await req.json());

    const updated = await db.$transaction(async (tx) => {
      const existing = await tx.announcement.findUnique({ where: { id } });
      if (!existing) throw new ApiError("NOT_FOUND", "공지를 찾을 수 없습니다.");

      const row = await tx.announcement.update({
        where: { id },
        data: {
          title: input.title,
          body: input.body,
          level: input.level,
          // 시작 시각을 비우면 기존 값을 유지한다(수정 때 의도치 않게 "지금"으로 바뀌지 않게).
          ...(input.startsAt && { starts_at: new Date(input.startsAt) }),
          ends_at: input.endsAt ? new Date(input.endsAt) : null,
          is_pinned: input.isPinned,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          admin_id: admin.id,
          target_user_email: "(시스템)",
          action: "UPDATE_ANNOUNCEMENT",
          target_label: row.title,
          reason: existing.title === row.title ? null : `제목: ${existing.title} → ${row.title}`,
        },
      });
      return row;
    });

    return toAdminAnnouncement(updated, new Date());
  },
);

export const DELETE = withApiHandler(
  async (
    _req: NextRequest,
    ctx: RouteContext<"/api/admin/announcements/[id]">,
  ): Promise<{ id: string }> => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    await db.$transaction(async (tx) => {
      const existing = await tx.announcement.findUnique({ where: { id } });
      if (!existing) throw new ApiError("NOT_FOUND", "공지를 찾을 수 없습니다.");
      await tx.announcement.delete({ where: { id } });
      await tx.adminAuditLog.create({
        data: {
          admin_id: admin.id,
          target_user_email: "(시스템)",
          action: "DELETE_ANNOUNCEMENT",
          target_label: existing.title,
        },
      });
    });

    return { id };
  },
);
