import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * `Vocabulary` rows carry no `user_id` — until word reuse/sharing ships, a
 * `UserVocabulary` link is the only per-user ownership signal we have, so we
 * gate on it and 404 either way (missing or someone else's) to avoid probing.
 *
 * Accepts an optional `$transaction` client so callers that need the
 * ownership read and a follow-up write to commit atomically (e.g. SRS review
 * updates) can pass `tx` instead of the default global `db`.
 */
export async function requireOwnedVocabulary(
  id: string,
  userId: string,
  client: typeof db | Prisma.TransactionClient = db,
) {
  const userVocabulary = await client.userVocabulary.findUnique({
    where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: id } },
  });
  if (!userVocabulary) {
    throw new ApiError("NOT_FOUND", "단어를 찾을 수 없습니다.");
  }
  return userVocabulary;
}

/**
 * `requireOwnedVocabulary`의 배치 버전(퀴즈 세션은 한 번에 여러 단어를 다룬다). 하나라도
 * 소유하지 않은/존재하지 않는 id가 섞여 있으면 어느 것이 문제인지 구분하지 않고 동일하게
 * 404 처리한다(단일 버전과 같은 이유 — 존재 여부 프로빙 방지).
 */
export async function requireOwnedVocabularies(
  ids: string[],
  userId: string,
  client: typeof db | Prisma.TransactionClient = db,
) {
  const uniqueIds = [...new Set(ids)];
  const userVocabularies = await client.userVocabulary.findMany({
    where: { user_id: userId, vocabulary_id: { in: uniqueIds } },
  });
  if (userVocabularies.length !== uniqueIds.length) {
    throw new ApiError("NOT_FOUND", "단어를 찾을 수 없습니다.");
  }
  return new Map(userVocabularies.map((row) => [row.vocabulary_id, row]));
}
