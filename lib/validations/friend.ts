import { z } from "zod";

export const followUserSchema = z.object({
  followeeId: z.string().uuid(),
});

export const userSearchQuerySchema = z.object({
  q: z.string().trim().min(1).max(50),
});

export type FollowUserInput = z.infer<typeof followUserSchema>;
export type UserSearchQueryInput = z.infer<typeof userSearchQuerySchema>;
