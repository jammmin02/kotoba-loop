import { z } from "zod";

import { PET_SPECIES } from "@/lib/pet/constants";

export const petSelectSchema = z.object({
  species: z.enum(PET_SPECIES),
});

export type PetSelectInput = z.infer<typeof petSelectSchema>;

/** 관리자 전용 — 1(레벨업)/-1(레벨다운)만 허용(app/api/admin/pet/level). */
export const petAdminLevelSchema = z.object({
  direction: z.union([z.literal(1), z.literal(-1)]),
});

export type PetAdminLevelInput = z.infer<typeof petAdminLevelSchema>;
