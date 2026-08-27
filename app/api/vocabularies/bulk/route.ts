import { checkWordRegisterAchievements } from "@/lib/achievement/service";
import { WORD_ANALYSIS_TYPE } from "@/lib/ai/word-analysis";
import { ApiError } from "@/lib/api/error";
import { withApiHandler } from "@/lib/api/handler";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { bulkSaveSchema } from "@/lib/validations/vocabulary";
import { syncVocabularyKanji } from "@/lib/vocabulary-kanji";
import { requireOwnedVocabularies } from "@/lib/vocabulary-ownership";
import type { BulkSaveItemResult, BulkSaveSummary } from "@/types/vocabulary";

import type { NextRequest } from "next/server";

/**
 * 사진 단어장 검수(PROMPT 31)의 최종 저장 — 중복 확인(check-duplicates) 후 사용자가 각
 * 단어에 고른 처리 방식(create/skip/link)을 한 트랜잭션으로 일괄 반영한다. 대량 저장 중
 * 하나라도 실패하면 전체가 롤백된다.
 */
export const POST = withApiHandler(async (req: NextRequest): Promise<BulkSaveSummary> => {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError("UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const body = await req.json();
  const { vocabularyBookIds, items } = bulkSaveSchema.parse(body);

  const ownedBookCount = await db.vocabularyBook.count({
    where: { id: { in: vocabularyBookIds }, user_id: session.user.id },
  });
  if (ownedBookCount !== vocabularyBookIds.length) {
    throw new ApiError("VALIDATION_ERROR", "선택한 단어장 중 접근할 수 없는 항목이 있습니다.");
  }

  const result = await db.$transaction(
    async (tx) => {
      const linkItems = items.filter((item) => item.resolution === "link");
      if (linkItems.length > 0) {
        // 클라이언트가 보낸 existingVocabularyId가 실제로 이 사용자 소유인지 재확인한다
        // (check-duplicates 응답을 그대로 신뢰하지 않는다).
        await requireOwnedVocabularies(
          linkItems.map((item) => item.existingVocabularyId),
          session.user.id,
          tx,
        );
      }

      const results: BulkSaveItemResult[] = [];
      let addedCount = 0;
      let linkedCount = 0;
      let skippedCount = 0;
      const aiAnalysesToMark: { id: string; edited: boolean }[] = [];

      for (const item of items) {
        if (item.resolution === "skip") {
          skippedCount += 1;
          results.push({ resolution: "skip", vocabularyId: null });
          continue;
        }

        if (item.resolution === "link") {
          await tx.vocabularyBookItem.createMany({
            data: vocabularyBookIds.map((bookId) => ({
              vocabulary_book_id: bookId,
              vocabulary_id: item.existingVocabularyId,
            })),
            skipDuplicates: true,
          });
          linkedCount += 1;
          results.push({ resolution: "link", vocabularyId: item.existingVocabularyId });
          continue;
        }

        const created = await tx.vocabulary.create({
          data: {
            word: item.word,
            reading: item.reading,
            part_of_speech: item.partOfSpeech,
            jlpt_level: item.jlptLevel,
            meanings: { create: item.meanings.map((meaning) => ({ meaning })) },
            examples: {
              create: item.examples.map((example) => ({
                japanese: example.japanese,
                korean: example.korean,
              })),
            },
            bookItems: {
              create: vocabularyBookIds.map((bookId) => ({ vocabulary_book_id: bookId })),
            },
          },
        });
        await tx.userVocabulary.create({
          data: { user_id: session.user.id, vocabulary_id: created.id, learning_status: "NEW" },
        });
        await syncVocabularyKanji(tx, created.id, item.word);
        addedCount += 1;
        results.push({ resolution: "create", vocabularyId: created.id });
        if (item.aiAnalysisId) {
          aiAnalysesToMark.push({ id: item.aiAnalysisId, edited: !!item.aiFieldsEdited });
        }
      }

      for (const { id, edited } of aiAnalysesToMark) {
        // Best-effort: 알 수 없는/타인 소유 id는 0행만 갱신하고 저장 자체는 실패하지 않는다.
        await tx.aIAnalysis.updateMany({
          where: { id, user_id: session.user.id, analysis_type: WORD_ANALYSIS_TYPE },
          data: { status: edited ? "edited" : "confirmed" },
        });
      }

      const unlockedAchievements =
        addedCount > 0 ? await checkWordRegisterAchievements(tx, session.user.id) : [];

      return { addedCount, linkedCount, skippedCount, results, unlockedAchievements };
    },
    { timeout: 30_000 },
  );

  return { ...result, vocabularyBookIds };
});
