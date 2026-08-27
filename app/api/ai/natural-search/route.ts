import { naturalSearch, type NaturalSearchResult } from "@/lib/ai/natural-search";
import { enforceRateLimit } from "@/lib/ai/rate-limit";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { naturalSearchSchema } from "@/lib/validations/ai";

import type { NextRequest } from "next/server";

export const POST = withApiHandler(async (req: NextRequest): Promise<NaturalSearchResult> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  enforceRateLimit("natural_search", session.user.id);

  const body = await req.json();
  const { query } = naturalSearchSchema.parse(body);

  return naturalSearch(query, session.user.id);
});
