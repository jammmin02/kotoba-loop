import { checkWordRegisterAchievements } from "@/lib/achievement/service";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { batchItemSchema, batchSaveSchema } from "@/lib/validations/vocabulary";
import { createVocabularyRecord } from "@/lib/vocabulary-create";
import { requireOwnedVocabulary } from "@/lib/vocabulary-ownership";
import type { BatchSaveItemResult, BatchSaveResponse } from "@/types/vocabulary";

import type { NextRequest } from "next/server";

/**
 * 새 단어 등록 화면의 한 번에 여러 단어 저장. 사진 검수용 `/api/vocabularies/bulk`는 전부 성공
 * 아니면 전부 롤백이지만, 여기서는 단어마다 따로 저장해 일부가 실패해도 나머지는 남기고 항목별
 * 결과를 `items`와 같은 순서로 돌려준다 — 화면이 실패한 카드만 남겨 다시 시도할 수 있게 하려는
 * 것이다. 각 항목은 create(새로 저장)/link(기존 단어를 선택한 단어장에 연결)/skip 중 하나다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<BatchSaveResponse> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }
  const userId = session.user.id;

  const { vocabularyBookIds, items } = batchSaveSchema.parse(await req.json());

  const ownedBookCount = await db.vocabularyBook.count({
    where: { id: { in: vocabularyBookIds }, user_id: userId },
  });
  if (ownedBookCount !== vocabularyBookIds.length) {
    throw new ApiError("VALIDATION_ERROR", "선택한 단어장 중 접근할 수 없는 항목이 있습니다.");
  }

  const results: BatchSaveItemResult[] = [];
  let createdCount = 0;

  for (const rawItem of items) {
    const parsed = batchItemSchema.safeParse(rawItem);
    if (!parsed.success) {
      results.push({
        status: "failed",
        message: parsed.error.issues[0]?.message ?? "입력을 확인해주세요.",
      });
      continue;
    }
    const item = parsed.data;

    if (item.resolution === "skip") {
      results.push({ status: "skipped", word: item.word });
      continue;
    }

    try {
      if (item.resolution === "link") {
        // 클라이언트가 보낸 existingVocabularyId가 실제로 이 사용자 소유인지 확인한다.
        await requireOwnedVocabulary(item.existingVocabularyId, userId);
        await db.vocabularyBookItem.createMany({
          data: vocabularyBookIds.map((bookId) => ({
            vocabulary_book_id: bookId,
            vocabulary_id: item.existingVocabularyId,
          })),
          skipDuplicates: true,
        });
        results.push({
          status: "linked",
          vocabularyId: item.existingVocabularyId,
          word: item.word,
        });
        continue;
      }

      const created = await db.$transaction((tx) =>
        createVocabularyRecord(tx, userId, { ...item, vocabularyBookIds }),
      );
      createdCount += 1;
      results.push({ status: "created", vocabularyId: created.id, word: created.word });
    } catch (err) {
      if (err instanceof ApiError) {
        results.push({ status: "failed", message: err.message });
      } else {
        console.error(err);
        results.push({ status: "failed", message: "저장 중 오류가 발생했습니다." });
      }
    }
  }

  const unlockedAchievements =
    createdCount > 0
      ? await db.$transaction((tx) => checkWordRegisterAchievements(tx, userId))
      : [];

  return { results, unlockedAchievements };
});
