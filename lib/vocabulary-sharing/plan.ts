/**
 * 단어 공유 판단 로직(순수 함수). 커뮤니티 단어장 가져오기는 단어를 복제하지 않고 원본 사용자와
 * 같은 `Vocabulary` 행을 가리키는 `UserVocabulary`/`VocabularyBookItem`을 만들기 때문에, 한
 * `Vocabulary`를 여러 사용자가 함께 쓸 수 있다. DB 접근은 `service.ts`가, "공유 중인가", "어떻게
 * 처리할까"의 결정은 여기서 한다.
 */

/**
 * 호출자 외의 사용자가 연결된 단어 id 집합. 다른 사용자의 `UserVocabulary`가 기본 신호이고,
 * `UserVocabulary` 백필이 안 된 예전 가져오기가 남긴 "다른 사용자 단어장의 항목"도 공유로 본다.
 */
export function findSharedVocabularyIds(
  otherUsersVocabularyIds: Iterable<string>,
  otherUsersBookItemVocabularyIds: Iterable<string>,
): Set<string> {
  return new Set([...otherUsersVocabularyIds, ...otherUsersBookItemVocabularyIds]);
}

export interface VocabularyRemovalPlan {
  /** 아무도 더 쓰지 않아 `Vocabulary` 행 자체를 지울 단어(DB cascade로 뜻/예문/학습 기록 포함). */
  deleteIds: string[];
  /** 다른 사용자가 쓰고 있어 행은 남기고 호출자의 연결만 끊을 단어. */
  unlinkIds: string[];
}

export function planVocabularyRemoval(
  ids: readonly string[],
  sharedIds: ReadonlySet<string>,
): VocabularyRemovalPlan {
  const unique = [...new Set(ids)];
  return {
    deleteIds: unique.filter((id) => !sharedIds.has(id)),
    unlinkIds: unique.filter((id) => sharedIds.has(id)),
  };
}

export type VocabularyEditMode = "in-place" | "copy-on-write";

/** 공유 중인 단어는 공용 행을 고치지 않고 호출자 전용 사본을 만들어 거기에 반영한다. */
export function planVocabularyEdit(isShared: boolean): VocabularyEditMode {
  return isShared ? "copy-on-write" : "in-place";
}
