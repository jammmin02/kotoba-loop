import { updateVocabulary } from "@/lib/admin/content-data";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { adminVocabularyUpdateSchema } from "@/lib/validations/admin-data";

import type { NextRequest } from "next/server";

export const PATCH = withApiHandler(
  async (
    req: NextRequest,
    ctx: RouteContext<"/api/admin/data/vocabulary/[id]">,
  ): Promise<{ ok: true }> => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const input = adminVocabularyUpdateSchema.parse(await req.json());
    await updateVocabulary(admin.id, id, input);
    return { ok: true };
  },
);
