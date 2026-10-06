import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth-guard";
import { normalizeEmailDomain } from "@/lib/email-domain";
import { getSettings, updateSettings } from "@/lib/settings";
import { adminSettingsUpdateSchema } from "@/lib/validations/admin";
import type { AdminSettings } from "@/types/admin";

import type { NextRequest } from "next/server";

export const GET = withApiHandler(async (): Promise<AdminSettings> => {
  await requireAdmin();
  return getSettings();
});

export const PATCH = withApiHandler(async (req: NextRequest): Promise<AdminSettings> => {
  const admin = await requireAdmin();
  const input = adminSettingsUpdateSchema.parse(await req.json());

  let allowedEmailDomains: string[] | undefined;
  if (input.allowedEmailDomains) {
    allowedEmailDomains = input.allowedEmailDomains.map((raw) => {
      const normalized = normalizeEmailDomain(raw);
      if (!normalized) {
        throw new ApiError("VALIDATION_ERROR", `올바르지 않은 도메인입니다: ${raw}`);
      }
      return normalized;
    });
  }

  await updateSettings(admin.id, {
    maintenanceEnabled: input.maintenanceEnabled,
    maintenanceMessage: input.maintenanceMessage,
    allowedEmailDomains,
  });
  return getSettings();
});
