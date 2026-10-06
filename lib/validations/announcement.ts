import { z } from "zod";

export const ANNOUNCEMENT_TITLE_MAX = 100;
export const ANNOUNCEMENT_BODY_MAX = 1000;

const isoDateSchema = z.iso.datetime({ offset: true, message: "올바른 날짜가 아닙니다." });

export const announcementInputSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "제목을 입력해주세요.")
      .max(ANNOUNCEMENT_TITLE_MAX, `제목은 ${ANNOUNCEMENT_TITLE_MAX}자 이하로 입력해주세요.`),
    body: z
      .string()
      .trim()
      .min(1, "내용을 입력해주세요.")
      .max(ANNOUNCEMENT_BODY_MAX, `내용은 ${ANNOUNCEMENT_BODY_MAX}자 이하로 입력해주세요.`),
    level: z.enum(["INFO", "WARNING"]),
    /** 비우면 지금부터 노출한다. */
    startsAt: isoDateSchema.nullable().optional(),
    /** 비우면 계속 노출한다. */
    endsAt: isoDateSchema.nullable().optional(),
    isPinned: z.boolean(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    path: ["endsAt"],
    message: "종료 시각은 시작 시각보다 늦어야 합니다.",
  });

export type AnnouncementInput = z.infer<typeof announcementInputSchema>;
