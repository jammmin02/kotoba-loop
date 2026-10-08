import type { db } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { syncVocabularyKanji } from "@/lib/vocabulary-kanji";

import { findSharedVocabularyIds, planVocabularyRemoval } from "./plan";

type Tx = Prisma.TransactionClient;
type Client = Tx | typeof db;

/** `ids` 중 호출자 외의 사용자도 연결돼 있는 단어 id 집합. */
export async function findSharedVocabularyIdsFor(
  client: Client,
  ids: readonly string[],
  userId: string,
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const [userVocabularies, bookItems] = await Promise.all([
    client.userVocabulary.findMany({
      where: { vocabulary_id: { in: [...ids] }, user_id: { not: userId } },
      select: { vocabulary_id: true },
    }),
    client.vocabularyBookItem.findMany({
      where: { vocabulary_id: { in: [...ids] }, book: { user_id: { not: userId } } },
      select: { vocabulary_id: true },
    }),
  ]);
  return findSharedVocabularyIds(
    userVocabularies.map((row) => row.vocabulary_id),
    bookItems.map((row) => row.vocabulary_id),
  );
}

export async function isVocabularyShared(
  client: Client,
  id: string,
  userId: string,
): Promise<boolean> {
  return (await findSharedVocabularyIdsFor(client, [id], userId)).has(id);
}

/** 호출자의 단어장 항목만 지운다(다른 사용자 단어장은 건드리지 않는다). */
export function deleteCallerBookItems(tx: Tx, vocabularyId: string, userId: string) {
  return tx.vocabularyBookItem.deleteMany({
    where: { vocabulary_id: vocabularyId, book: { user_id: userId } },
  });
}

/**
 * 호출자 입장에서 단어를 없앤다. 다른 사용자가 쓰는 단어는 호출자의 UserVocabulary/단어장 항목/
 * 태그 연결/문장만 지우고 행은 유지하며, 아무도 안 쓰면 행 자체를 지운다.
 * 호출자가 소유권(`requireOwnedVocabulary`)을 이미 확인했다고 가정한다.
 */
export async function removeVocabulariesForUser(
  tx: Tx,
  ids: readonly string[],
  userId: string,
): Promise<{ deletedIds: string[]; unlinkedIds: string[] }> {
  const sharedIds = await findSharedVocabularyIdsFor(tx, ids, userId);
  const { deleteIds, unlinkIds } = planVocabularyRemoval(ids, sharedIds);

  if (unlinkIds.length > 0) {
    await tx.vocabularyBookItem.deleteMany({
      where: { vocabulary_id: { in: unlinkIds }, book: { user_id: userId } },
    });
    await tx.vocabularyTag.deleteMany({
      where: { vocabulary_id: { in: unlinkIds }, tag: { user_id: userId } },
    });
    await tx.userSentence.deleteMany({
      where: { user_id: userId, vocabulary_id: { in: unlinkIds } },
    });
    await tx.userVocabulary.deleteMany({
      where: { user_id: userId, vocabulary_id: { in: unlinkIds } },
    });
  }
  if (deleteIds.length > 0) {
    await tx.vocabulary.deleteMany({ where: { id: { in: deleteIds } } });
  }

  return { deletedIds: deleteIds, unlinkedIds: unlinkIds };
}

/**
 * copy-on-write: 공유 중인 단어의 호출자 전용 사본을 만들고 호출자의 연결(UserVocabulary, 단어장
 * 항목, 태그 연결, 문장, 퀴즈 기록)을 그쪽으로 옮긴다. 뜻/예문/관련 표현은 비워 둔다 — 수정 요청이
 * 곧바로 새 값으로 채운다. 이미지는 수정 대상이 아니므로 그대로 복사한다.
 */
export async function forkVocabularyForUser(
  tx: Tx,
  sourceId: string,
  userId: string,
): Promise<string> {
  const source = await tx.vocabulary.findUniqueOrThrow({
    where: { id: sourceId },
    include: { images: true },
  });

  const fork = await tx.vocabulary.create({
    data: {
      word: source.word,
      reading: source.reading,
      part_of_speech: source.part_of_speech,
      jlpt_level: source.jlpt_level,
      difficulty: source.difficulty,
      images: {
        create: source.images.map((image) => ({
          image_url: image.image_url,
          image_type: image.image_type,
        })),
      },
    },
  });

  const callerTags = await tx.vocabularyTag.findMany({
    where: { vocabulary_id: sourceId, tag: { user_id: userId } },
    select: { tag_id: true },
  });
  if (callerTags.length > 0) {
    await tx.vocabularyTag.createMany({
      data: callerTags.map(({ tag_id }) => ({ vocabulary_id: fork.id, tag_id })),
    });
    await tx.vocabularyTag.deleteMany({
      where: { vocabulary_id: sourceId, tag: { user_id: userId } },
    });
  }

  await tx.vocabularyBookItem.updateMany({
    where: { vocabulary_id: sourceId, book: { user_id: userId } },
    data: { vocabulary_id: fork.id },
  });
  await tx.userVocabulary.update({
    where: { user_id_vocabulary_id: { user_id: userId, vocabulary_id: sourceId } },
    data: { vocabulary_id: fork.id },
  });
  await tx.userSentence.updateMany({
    where: { user_id: userId, vocabulary_id: sourceId },
    data: { vocabulary_id: fork.id },
  });
  // 오답노트/통계는 target_id(FK 없음)로 단어를 집계하므로 호출자의 기록도 사본으로 따라가야 한다.
  await tx.reviewHistory.updateMany({
    where: { user_id: userId, target_type: "vocab", target_id: sourceId },
    data: { target_id: fork.id },
  });
  await syncVocabularyKanji(tx, fork.id, source.word);

  return fork.id;
}
