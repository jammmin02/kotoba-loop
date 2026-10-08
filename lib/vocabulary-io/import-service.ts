import { randomUUID } from "node:crypto";

import { checkWordRegisterAchievements } from "@/lib/achievement/service";
import { ApiError } from "@/lib/api/error";
import { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { duplicateKey, findExistingVocabularies } from "@/lib/vocabulary-duplicate";
import type { UnlockedAchievementView } from "@/types/achievement";

import { DEFAULT_PART_OF_SPEECH, importItemSchema } from "./schema";

import type { ImportChunkInput, ImportChunkResult, ImportItem, ImportItemResult } from "./schema";

const TRANSACTION_TIMEOUT_MS = 60_000;

/** "덮어쓰기"가 건드리면 안 되는 단어(다른 사용자가 같은 단어 행을 쓰는 경우)를 건너뛸 때의 사유. */
const SHARED_WORD_REASON = "다른 사용자와 공유 중인 단어라 덮어쓰지 않았어요.";
const EXISTING_WORD_REASON = "이미 있는 단어예요.";
const FILE_DUPLICATE_REASON = "같은 요청 안에서 중복된 단어예요.";

type Tx = Prisma.TransactionClient;

interface ValidItem {
  index: number;
  item: ImportItem;
}

/**
 * 스키마가 직접 쓴 한국어 메시지만 사용자에게 보여준다. 필드가 아예 없는 등 zod 기본(영어) 메시지가
 * 나오는 경우는 일반 문구로 대신한다.
 */
function failureReason(issues: { message: string }[]): string {
  const messages = [...new Set(issues.map((issue) => issue.message))].filter((message) =>
    /[가-힣]/.test(message),
  );
  return messages.length > 0 ? messages.join(", ") : "항목 형식이 올바르지 않아요.";
}

function emptyCounts(): ImportChunkResult["counts"] {
  return { created: 0, overwritten: 0, "kept-both": 0, skipped: 0, failed: 0 };
}

/**
 * 파일에서 읽은 단어 묶음(최대 `IMPORT_CHUNK_SIZE`개)을 한 트랜잭션으로 저장한다.
 *
 * 중복(같은 단어+읽기) 처리:
 * - skip: 기존 단어를 그대로 둔다.
 * - keep-both: 중복이어도 새 단어로 추가한다.
 * - overwrite: 기존 단어의 뜻을 파일 값으로 바꾸고(예문은 파일에 있을 때만), 태그는 합치고,
 *   즐겨찾기는 켜기만 하며, 학습 기록은 `includeProgress`일 때만 바꾼다. 다른 사용자와 단어 행을
 *   공유하는 경우(커뮤니티 단어장 가져오기)에는 남의 데이터를 바꾸지 않도록 건너뛴다.
 */
export async function importVocabularyChunk(
  userId: string,
  input: ImportChunkInput,
  /** 이미 열린 트랜잭션 안에서 실행하고 싶을 때(검증 스크립트가 끝에 롤백하는 용도). */
  client: typeof db | Tx = db,
): Promise<ImportChunkResult & { unlockedAchievements: UnlockedAchievementView[] }> {
  const results: ImportItemResult[] = input.items.map(() => ({ status: "failed" as const }));

  const valid: ValidItem[] = [];
  input.items.forEach((raw, index) => {
    const parsed = importItemSchema.safeParse(raw);
    if (parsed.success) valid.push({ index, item: parsed.data });
    else {
      results[index] = {
        status: "failed",
        reason: failureReason(parsed.error.issues),
      };
    }
  });

  const run = async (tx: Tx): Promise<UnlockedAchievementView[]> => {
    if (valid.length === 0) return [];

    const bookIds = [...new Set(valid.flatMap(({ item }) => item.bookIds))];
    const ownedBookCount = await tx.vocabularyBook.count({
      where: { id: { in: bookIds }, user_id: userId },
    });
    if (ownedBookCount !== bookIds.length) {
      throw new ApiError("VALIDATION_ERROR", "선택한 단어장 중 접근할 수 없는 항목이 있습니다.");
    }

    const existingByKey = await findExistingVocabularies(
      valid.map(({ item }) => ({ word: item.word, reading: item.reading })),
      userId,
      tx,
    );

    const toCreate: (ValidItem & { keptBoth: boolean })[] = [];
    const overwriteCandidates: (ValidItem & { existingId: string })[] = [];
    const seenInChunk = new Set<string>();

    for (const entry of valid) {
      const key = duplicateKey(entry.item.word, entry.item.reading);
      const existing = existingByKey.get(key);
      const repeatedInChunk = seenInChunk.has(key);
      seenInChunk.add(key);

      if (input.duplicatePolicy === "keep-both") {
        toCreate.push({ ...entry, keptBoth: !!existing || repeatedInChunk });
      } else if (repeatedInChunk) {
        results[entry.index] = { status: "skipped", reason: FILE_DUPLICATE_REASON };
      } else if (!existing) {
        toCreate.push({ ...entry, keptBoth: false });
      } else if (input.duplicatePolicy === "skip") {
        results[entry.index] = { status: "skipped", reason: EXISTING_WORD_REASON };
      } else {
        overwriteCandidates.push({ ...entry, existingId: existing.id });
      }
    }

    // 다른 사용자도 같은 단어 행을 쓰고 있으면(커뮤니티 가져오기) 덮어쓰지 않는다.
    const sharedIds = new Set(
      overwriteCandidates.length === 0
        ? []
        : (
            await tx.userVocabulary.findMany({
              where: {
                vocabulary_id: { in: overwriteCandidates.map((entry) => entry.existingId) },
                user_id: { not: userId },
              },
              select: { vocabulary_id: true },
              distinct: ["vocabulary_id"],
            })
          ).map((row) => row.vocabulary_id),
    );
    const toOverwrite = overwriteCandidates.filter((entry) => {
      if (!sharedIds.has(entry.existingId)) return true;
      results[entry.index] = { status: "skipped", reason: SHARED_WORD_REASON };
      return false;
    });

    const tagIdByName = await resolveTagIds(
      tx,
      userId,
      [...toCreate, ...toOverwrite].flatMap(({ item }) => item.tags),
    );

    await createWords(tx, userId, toCreate, tagIdByName, input.includeProgress, results);
    await overwriteWords(tx, userId, toOverwrite, tagIdByName, input.includeProgress, results);

    return toCreate.length > 0 ? checkWordRegisterAchievements(tx, userId) : [];
  };
  const unlockedAchievements =
    "$transaction" in client
      ? await client.$transaction(run, { timeout: TRANSACTION_TIMEOUT_MS })
      : await run(client);

  const counts = emptyCounts();
  for (const result of results) counts[result.status] += 1;
  return { results, counts, unlockedAchievements };
}

/** 이름으로 내 태그를 찾고, 없는 것은 만든다. */
async function resolveTagIds(tx: Tx, userId: string, names: string[]) {
  const uniqueNames = [...new Set(names)];
  const idByName = new Map<string, string>();
  if (uniqueNames.length === 0) return idByName;

  const load = async () => {
    const rows = await tx.tag.findMany({
      where: { user_id: userId, name: { in: uniqueNames } },
      select: { id: true, name: true },
    });
    for (const row of rows) idByName.set(row.name, row.id);
  };

  await load();
  const missing = uniqueNames.filter((name) => !idByName.has(name));
  if (missing.length > 0) {
    await tx.tag.createMany({
      data: missing.map((name) => ({ user_id: userId, name })),
      skipDuplicates: true,
    });
    await load();
  }
  return idByName;
}

function progressColumns(progress: NonNullable<ImportItem["progress"]>) {
  return {
    learning_status: progress.learningStatus,
    interval_stage: progress.intervalStage,
    next_review_at: progress.nextReviewAt ? new Date(progress.nextReviewAt) : null,
    last_reviewed_at: progress.lastReviewedAt ? new Date(progress.lastReviewedAt) : null,
    correct_count: progress.correctCount,
    wrong_count: progress.wrongCount,
  };
}

async function createWords(
  tx: Tx,
  userId: string,
  entries: (ValidItem & { keptBoth: boolean })[],
  tagIdByName: Map<string, string>,
  includeProgress: boolean,
  results: ImportItemResult[],
) {
  if (entries.length === 0) return;

  // 파일 순서대로 "최근 추가순"에 나타나도록 생성 시각을 1ms씩 어긋나게 둔다.
  const baseTime = Date.now();
  const created = entries.map((entry, order) => ({
    ...entry,
    id: randomUUID(),
    createdAt: new Date(baseTime + order),
  }));

  await tx.vocabulary.createMany({
    data: created.map(({ id, item, createdAt }) => ({
      id,
      word: item.word,
      reading: item.reading,
      part_of_speech: item.partOfSpeech,
      jlpt_level: item.jlptLevel,
      created_at: createdAt,
    })),
  });
  await tx.vocabularyMeaning.createMany({
    data: created.flatMap(({ id, item }) =>
      item.meanings.map((meaning) => ({ vocabulary_id: id, meaning })),
    ),
  });
  await tx.exampleSentence.createMany({
    data: created.flatMap(({ id, item }) =>
      item.examples.map((example) => ({
        vocabulary_id: id,
        japanese: example.japanese,
        korean: example.korean,
      })),
    ),
  });
  await tx.vocabularyBookItem.createMany({
    data: created.flatMap(({ id, item }) =>
      item.bookIds.map((bookId) => ({ vocabulary_book_id: bookId, vocabulary_id: id })),
    ),
  });
  await tx.userVocabulary.createMany({
    data: created.map(({ id, item, createdAt }) => ({
      user_id: userId,
      vocabulary_id: id,
      is_favorite: item.isFavorite,
      created_at: createdAt,
      ...(includeProgress && item.progress ? progressColumns(item.progress) : {}),
    })),
  });
  await tx.vocabularyTag.createMany({
    data: created.flatMap(({ id, item }) =>
      item.tags.flatMap((name) => {
        const tagId = tagIdByName.get(name);
        return tagId ? [{ vocabulary_id: id, tag_id: tagId }] : [];
      }),
    ),
    skipDuplicates: true,
  });

  // 한자 연결은 `syncVocabularyKanji`와 같은 규칙(常用漢字에 있는 글자만)을 한 번의 조회로 처리한다.
  const characters = [...new Set(created.flatMap(({ item }) => Array.from(item.word)))];
  const kanjiRows = await tx.kanji.findMany({
    where: { character: { in: characters } },
    select: { id: true, character: true },
  });
  const kanjiIdByCharacter = new Map(kanjiRows.map((row) => [row.character, row.id]));
  await tx.vocabularyKanji.createMany({
    data: created.flatMap(({ id, item }) =>
      [...new Set(Array.from(item.word))].flatMap((character) => {
        const kanjiId = kanjiIdByCharacter.get(character);
        return kanjiId ? [{ vocabulary_id: id, kanji_id: kanjiId }] : [];
      }),
    ),
    skipDuplicates: true,
  });

  for (const { index, keptBoth } of created) {
    results[index] = { status: keptBoth ? "kept-both" : "created" };
  }
}

async function overwriteWords(
  tx: Tx,
  userId: string,
  entries: (ValidItem & { existingId: string })[],
  tagIdByName: Map<string, string>,
  includeProgress: boolean,
  results: ImportItemResult[],
) {
  if (entries.length === 0) return;
  const ids = entries.map((entry) => entry.existingId);

  // 뜻은 항상 파일 값으로 교체한다. 예문은 파일에 있을 때만 교체한다(CSV는 예문이 1쌍뿐이라
  // 비어 있다고 해서 기존 예문을 지우면 안 된다).
  await tx.vocabularyMeaning.deleteMany({ where: { vocabulary_id: { in: ids } } });
  await tx.vocabularyMeaning.createMany({
    data: entries.flatMap(({ existingId, item }) =>
      item.meanings.map((meaning) => ({ vocabulary_id: existingId, meaning })),
    ),
  });

  const withExamples = entries.filter(({ item }) => item.examples.length > 0);
  if (withExamples.length > 0) {
    await tx.exampleSentence.deleteMany({
      where: { vocabulary_id: { in: withExamples.map((entry) => entry.existingId) } },
    });
    await tx.exampleSentence.createMany({
      data: withExamples.flatMap(({ existingId, item }) =>
        item.examples.map((example) => ({
          vocabulary_id: existingId,
          japanese: example.japanese,
          korean: example.korean,
        })),
      ),
    });
  }

  await tx.vocabularyBookItem.createMany({
    data: entries.flatMap(({ existingId, item }) =>
      item.bookIds.map((bookId) => ({ vocabulary_book_id: bookId, vocabulary_id: existingId })),
    ),
    skipDuplicates: true,
  });
  await tx.vocabularyTag.createMany({
    data: entries.flatMap(({ existingId, item }) =>
      item.tags.flatMap((name) => {
        const tagId = tagIdByName.get(name);
        return tagId ? [{ vocabulary_id: existingId, tag_id: tagId }] : [];
      }),
    ),
    skipDuplicates: true,
  });

  for (const { existingId, item, index } of entries) {
    // 품사·JLPT는 파일에 값이 있을 때만 바꾼다(CSV의 빈 칸이 기존 값을 지우지 않게).
    const vocabularyData: Prisma.VocabularyUpdateInput = {
      ...(item.partOfSpeech !== DEFAULT_PART_OF_SPEECH && { part_of_speech: item.partOfSpeech }),
      ...(item.jlptLevel && { jlpt_level: item.jlptLevel }),
    };
    if (Object.keys(vocabularyData).length > 0) {
      await tx.vocabulary.update({ where: { id: existingId }, data: vocabularyData });
    }

    const userVocabularyData: Prisma.UserVocabularyUpdateInput = {
      ...(item.isFavorite && { is_favorite: true }),
      ...(includeProgress && item.progress ? progressColumns(item.progress) : {}),
    };
    if (Object.keys(userVocabularyData).length > 0) {
      await tx.userVocabulary.update({
        where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: existingId } },
        data: userVocabularyData,
      });
    }
    results[index] = { status: "overwritten" };
  }
}
