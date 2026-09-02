import { z } from "zod";

export const COMMUNITY_PAGE_SIZE_DEFAULT = 20;
export const COMMUNITY_PAGE_SIZE_MAX = 50;

export const communityBookQuerySchema = z.object({
  sort: z.enum(["recent", "popular"]).default("recent"),
  userId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(COMMUNITY_PAGE_SIZE_MAX)
    .default(COMMUNITY_PAGE_SIZE_DEFAULT),
});

export type CommunityBookQueryInput = z.infer<typeof communityBookQuerySchema>;
