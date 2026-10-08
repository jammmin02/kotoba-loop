/**
 * 공유 Vocabulary 행 버그 재현/검증 스크립트. 모든 시나리오는 각자 하나의 트랜잭션 안에서 실행하고
 * 끝에 항상 예외를 던져 ROLLBACK 한다 — DB에는 아무것도 남지 않는다.
 *
 *   npx tsx prisma/repro-shared-vocabulary.ts
 *
 * "OLD"는 수정 전 라우트가 실행하던 문장을 그대로 재현하고, "NEW"는 수정 후 서비스를 호출한다.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { PrismaClient } from "../lib/generated/prisma/client";
import { planVocabularyEdit } from "../lib/vocabulary-sharing/plan";
import {
  deleteCallerBookItems,
  forkVocabularyForUser,
  isVocabularyShared,
  removeVocabulariesForUser,
} from "../lib/vocabulary-sharing/service";

import type { Prisma } from "../lib/generated/prisma/client";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
type Tx = Prisma.TransactionClient;

class Rollback extends Error {
  constructor(readonly result: unknown) {
    super("rollback");
  }
}

async function inRolledBackTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    await db.$transaction(async (tx) => {
      throw new Rollback(await fn(tx));
    });
  } catch (error) {
    if (error instanceof Rollback) return error.result as T;
    throw error;
  }
  throw new Error("unreachable");
}

const stamp = `repro-${Date.now()}`;

/** A가 만든 단어를 B가 커뮤니티 가져오기로 공유한 상태를 만든다. */
async function seedShared(tx: Tx) {
  const a = await tx.user.create({ data: { email: `${stamp}-a@example.com`, nickname: "A" } });
  const b = await tx.user.create({ data: { email: `${stamp}-b@example.com`, nickname: "B" } });
  const vocab = await tx.vocabulary.create({
    data: {
      word: "猫",
      reading: "ねこ",
      part_of_speech: "noun",
      meanings: { create: [{ meaning: "고양이" }] },
    },
  });
  const bookA = await tx.vocabularyBook.create({ data: { user_id: a.id, name: "A book" } });
  const bookB = await tx.vocabularyBook.create({ data: { user_id: b.id, name: "B book" } });
  for (const [user, book] of [
    [a, bookA],
    [b, bookB],
  ] as const) {
    await tx.userVocabulary.create({
      data: { user_id: user.id, vocabulary_id: vocab.id, correct_count: 3 },
    });
    await tx.vocabularyBookItem.create({
      data: { vocabulary_book_id: book.id, vocabulary_id: vocab.id },
    });
    const tag = await tx.tag.create({ data: { user_id: user.id, name: `tag-${user.nickname}` } });
    await tx.vocabularyTag.create({ data: { vocabulary_id: vocab.id, tag_id: tag.id } });
  }
  return { a, b, vocab, bookA, bookB };
}

async function snapshotFor(tx: Tx, userId: string, vocabularyId: string) {
  return {
    vocabularyExists: (await tx.vocabulary.count({ where: { id: vocabularyId } })) === 1,
    userVocabulary: await tx.userVocabulary.count({
      where: { user_id: userId, vocabulary_id: vocabularyId },
    }),
    bookItems: await tx.vocabularyBookItem.count({
      where: { vocabulary_id: vocabularyId, book: { user_id: userId } },
    }),
  };
}

const results: { name: string; ok: boolean }[] = [];
function check(name: string, ok: boolean, detail: unknown) {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`, ok ? "" : JSON.stringify(detail));
}

async function main() {
  // 1) DELETE — OLD: A가 지우면 B의 단어도 사라진다(버그 재현).
  const oldDelete = await inRolledBackTx(async (tx) => {
    const { b, vocab } = await seedShared(tx);
    await tx.vocabulary.delete({ where: { id: vocab.id } });
    return snapshotFor(tx, b.id, vocab.id);
  });
  check(
    "OLD DELETE wipes B's word (bug reproduced)",
    !oldDelete.vocabularyExists && oldDelete.userVocabulary === 0 && oldDelete.bookItems === 0,
    oldDelete,
  );

  // 2) DELETE — NEW: A의 연결만 끊기고 B는 그대로.
  const newDelete = await inRolledBackTx(async (tx) => {
    const { a, b, vocab } = await seedShared(tx);
    const outcome = await removeVocabulariesForUser(tx, [vocab.id], a.id);
    const tags = (userId: string) =>
      tx.vocabularyTag.count({ where: { vocabulary_id: vocab.id, tag: { user_id: userId } } });
    return {
      outcome,
      a: await snapshotFor(tx, a.id, vocab.id),
      b: await snapshotFor(tx, b.id, vocab.id),
      aTags: await tags(a.id),
      bTags: await tags(b.id),
    };
  });
  check(
    "NEW DELETE keeps row + B's data, removes only A's",
    newDelete.outcome.unlinkedIds.length === 1 &&
      newDelete.b.vocabularyExists &&
      newDelete.b.userVocabulary === 1 &&
      newDelete.b.bookItems === 1 &&
      newDelete.bTags === 1 &&
      newDelete.a.userVocabulary === 0 &&
      newDelete.a.bookItems === 0 &&
      newDelete.aTags === 0,
    newDelete,
  );

  // 3) DELETE — NEW: 혼자 쓰는 단어는 행까지 삭제.
  const soloDelete = await inRolledBackTx(async (tx) => {
    const { a, b, vocab } = await seedShared(tx);
    await tx.userVocabulary.delete({
      where: { user_id_vocabulary_id: { user_id: b.id, vocabulary_id: vocab.id } },
    });
    await tx.vocabularyBookItem.deleteMany({
      where: { vocabulary_id: vocab.id, book: { user_id: b.id } },
    });
    const outcome = await removeVocabulariesForUser(tx, [vocab.id], a.id);
    return { outcome, exists: (await tx.vocabulary.count({ where: { id: vocab.id } })) === 1 };
  });
  check(
    "NEW DELETE removes the row when unshared",
    soloDelete.outcome.deletedIds.length === 1 && !soloDelete.exists,
    soloDelete,
  );

  // 4) PATCH — OLD: A가 수정하면 B의 단어장 항목이 지워지고 공용 뜻이 바뀐다(버그 재현).
  const oldPatch = await inRolledBackTx(async (tx) => {
    const { b, vocab } = await seedShared(tx);
    await tx.vocabularyBookItem.deleteMany({ where: { vocabulary_id: vocab.id } });
    await tx.vocabularyMeaning.deleteMany({ where: { vocabulary_id: vocab.id } });
    await tx.vocabularyMeaning.create({ data: { vocabulary_id: vocab.id, meaning: "A가 바꾼 뜻" } });
    return {
      b: await snapshotFor(tx, b.id, vocab.id),
      meaning: (await tx.vocabularyMeaning.findFirstOrThrow({ where: { vocabulary_id: vocab.id } }))
        .meaning,
    };
  });
  check(
    "OLD PATCH drops B's book item and rewrites the shared meaning (bug reproduced)",
    oldPatch.b.bookItems === 0 && oldPatch.meaning === "A가 바꾼 뜻",
    oldPatch,
  );

  // 5) PATCH — NEW: copy-on-write.
  const newPatch = await inRolledBackTx(async (tx) => {
    const { a, b, vocab, bookA } = await seedShared(tx);
    await tx.userSentence.create({
      data: { user_id: a.id, vocabulary_id: vocab.id, sentence: "猫が好き" },
    });
    await tx.reviewHistory.create({
      data: {
        user_id: a.id,
        target_type: "vocab",
        target_id: vocab.id,
        quiz_type: "x",
        result: true,
        response_time: 1,
      },
    });
    const mode = planVocabularyEdit(await isVocabularyShared(tx, vocab.id, a.id));
    const targetId =
      mode === "copy-on-write" ? await forkVocabularyForUser(tx, vocab.id, a.id) : vocab.id;
    await tx.vocabularyMeaning.deleteMany({ where: { vocabulary_id: targetId } });
    await deleteCallerBookItems(tx, targetId, a.id);
    await tx.vocabulary.update({
      where: { id: targetId },
      data: {
        reading: "ネコ",
        meanings: { create: [{ meaning: "A가 바꾼 뜻" }] },
        bookItems: { create: [{ vocabulary_book_id: bookA.id }] },
      },
    });
    const tags = (userId: string, vocabularyId: string) =>
      tx.vocabularyTag.count({ where: { vocabulary_id: vocabularyId, tag: { user_id: userId } } });
    return {
      mode,
      forked: targetId !== vocab.id,
      bOnShared: await snapshotFor(tx, b.id, vocab.id),
      sharedReading: (await tx.vocabulary.findUniqueOrThrow({ where: { id: vocab.id } })).reading,
      sharedMeaning: (
        await tx.vocabularyMeaning.findFirstOrThrow({ where: { vocabulary_id: vocab.id } })
      ).meaning,
      aOnFork: await snapshotFor(tx, a.id, targetId),
      aOnShared: await snapshotFor(tx, a.id, vocab.id),
      aTagsOnFork: await tags(a.id, targetId),
      bTagsOnShared: await tags(b.id, vocab.id),
      sentenceMoved: await tx.userSentence.count({
        where: { user_id: a.id, vocabulary_id: targetId },
      }),
      historyMoved: await tx.reviewHistory.count({
        where: { user_id: a.id, target_id: targetId },
      }),
      correctCount: (
        await tx.userVocabulary.findUniqueOrThrow({
          where: { user_id_vocabulary_id: { user_id: a.id, vocabulary_id: targetId } },
        })
      ).correct_count,
    };
  });
  check(
    "NEW PATCH forks for A, leaves the shared row and B untouched",
    newPatch.mode === "copy-on-write" &&
      newPatch.forked &&
      newPatch.bOnShared.userVocabulary === 1 &&
      newPatch.bOnShared.bookItems === 1 &&
      newPatch.sharedReading === "ねこ" &&
      newPatch.sharedMeaning === "고양이" &&
      newPatch.aOnShared.userVocabulary === 0 &&
      newPatch.aOnFork.userVocabulary === 1 &&
      newPatch.aOnFork.bookItems === 1 &&
      newPatch.aTagsOnFork === 1 &&
      newPatch.bTagsOnShared === 1 &&
      newPatch.sentenceMoved === 1 &&
      newPatch.historyMoved === 1 &&
      newPatch.correctCount === 3,
    newPatch,
  );

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed (all changes rolled back)`,
  );
  process.exitCode = failed.length ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
